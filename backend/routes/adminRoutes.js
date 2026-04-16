import express from "express";
import { query } from "../db/index.js";
import { getAccessToken } from "../services/graphservice.js";
import { sendSlackMessage, sendSlackMessageWithFiles } from "../services/sendSlack.js";
import { approveDraft } from "../agent/tools/approveDraft.js";
import { getTeamsStatus } from "../services/teamsSubscription.js";
import whatsappBot from "../services/whatsappBot.js";
import { SELECTED_WHATSAPP_GROUPS } from "../config/whatsappGroups.js";
import { requireTenant } from "../middleware/tenantContext.js";
import { fail, ok } from "../utils/apiResponse.js";

// adminRoute.js file
const router = express.Router();
router.use(requireTenant);
const TEAMS_FILTER_BY_MAPPING = String(process.env.TEAMS_FILTER_BY_MAPPING || "true").toLowerCase() !== "false";
const draftsCache = new Map();
const DRAFTS_CACHE_TTL_MS = Number(process.env.DRAFTS_CACHE_TTL_MS || 15000);

async function getAllowedTeamsChatIds(tenantId) {
  const monitored = (process.env.MONITORED_CHAT_IDS || "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (!TEAMS_FILTER_BY_MAPPING) return monitored;
  try {
    const mapped = await query(
      `SELECT teams_chat_id
       FROM channel_mappings
       WHERE tenant_id = $1
         AND active = true
         AND teams_chat_id IS NOT NULL
         AND teams_chat_id != ''
         AND (
           (whatsapp_group_name IS NOT NULL AND whatsapp_group_name != '')
           OR (
             slack_channel_id IS NOT NULL
             AND slack_channel_id != ''
             AND LOWER(slack_channel_id) != 'none'
           )
         )`,
      [tenantId]
    );
    const ids = mapped.rows.map((r) => String(r.teams_chat_id || "").trim()).filter(Boolean);
    if (ids.length > 0) return ids;
  } catch (err) {
    console.warn(`⚠️ Failed to load mapped Teams chat ids for drafts filter: ${err.message}`);
  }
  return monitored;
}

// ─── GET /api/messages/health ────────────────────────────────────────────────
router.get("/health", async (req, res) => {
  try {
    const teamsStatus = getTeamsStatus();
    
    // WhatsApp status from bot
    const waStatus = {
      status: whatsappBot.status || 'unknown',
      isReady: whatsappBot.isReady,
      groups: Array.from(whatsappBot.groups.keys()).length,
      lastHealthCheck: whatsappBot.lastHealthCheck
    };

    // DB health check
    let dbStatus = "ok";
    try {
      await query("SELECT 1");
    } catch (e) {
      dbStatus = "error";
    }

    // System config
    const config = {
      port: process.env.PORT || 5000,
      ngrok: process.env.NGROK_URL || "not set",
      monitoredChats: (process.env.MONITORED_CHAT_IDS || "").split(",").filter(Boolean).length
    };

    return ok(res, {
      status: "online",
      db: dbStatus,
      teams: teamsStatus,
      whatsapp: waStatus,
      config: config,
      timestamp: new Date()
    });
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// ─── GET /api/messages/drafts ─────────────────────────────────────────────────
router.get("/drafts", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const cacheKey = `${tenantId || 'default'}:drafts`;
    const cached = draftsCache.get(cacheKey);
    if (cached && (Date.now() - cached.at) < DRAFTS_CACHE_TTL_MS) {
      return ok(res, cached.rows);
    }
    const now = new Date();
    const isMonday = now.getDay() === 1;
    const allowedTeamsChatIds = await getAllowedTeamsChatIds(tenantId);
    if (allowedTeamsChatIds.length === 0) {
      console.warn("⛔ No allowed Teams chats for drafts; returning empty list");
      return ok(res, []);
    }
    
    // Today's drafts or last 4 from Friday if Monday
    const draftsSQL = `
      WITH tz AS (
        SELECT (NOW() AT TIME ZONE 'Asia/Kolkata')::date AS today_ist
      ),
      all_drafts AS (
        SELECT 
          id, sender, 'teams'::text as source_type,
          COALESCE(approved_draft, body) AS content,
          body AS original_body,
          timestamp AS created_at,
          source_id,
          COALESCE(approval_status, 'waiting') AS approval_status,
          COALESCE(suggested_platform, '') AS suggested_platform,
          approved_draft,
          COALESCE(recipient_name, '') AS recipient_name,
          COALESCE(recipient_slack_id, '') AS recipient_slack_id,
          COALESCE(recipient_whatsapp, '') AS recipient_whatsapp,
          COALESCE(priority, 'normal') AS priority,
          COALESCE(flag_admin, false) AS flag_admin,
          COALESCE(message_type, '') AS message_type,
          COALESCE(ai_reasoning, '') AS ai_reasoning,
          COALESCE(chat_name, '') AS chat_name,
          COALESCE(files, '[]') AS files,
          '[]' AS attachments
        FROM teams_messages
        WHERE tenant_id = $2
          AND source_id = ANY($3)
          AND approval_status IS DISTINCT FROM 'ignored'
          AND approval_status IS DISTINCT FROM 'forwarded'
          AND (
            -- Today's messages
            (timestamp AT TIME ZONE 'Asia/Kolkata')::date = (SELECT today_ist FROM tz)
            OR 
            -- Last Friday's messages if today is Monday
            (
              $1 = TRUE 
              AND (timestamp AT TIME ZONE 'Asia/Kolkata')::date = (SELECT today_ist FROM tz) - INTERVAL '3 days'
            )
          )
        ORDER BY created_at DESC
      )
      SELECT * FROM all_drafts
      LIMIT CASE WHEN (SELECT count(*) FROM all_drafts WHERE (created_at AT TIME ZONE 'Asia/Kolkata')::date = (SELECT today_ist FROM tz)) > 0 THEN 20 ELSE 4 END
    `;

    const result = await query(draftsSQL, [isMonday, tenantId, allowedTeamsChatIds]);
    draftsCache.set(cacheKey, { at: Date.now(), rows: result.rows });
    return ok(res, result.rows);
  } catch (error) {
    console.error("Fetch unified drafts error:", error);
    return fail(res, 500, "Failed to fetch drafts", { details: error.message });
  }
});

// ─── POST /api/messages/approve/:id ──────────────────────────────────────────
router.post("/approve/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = parseInt(req.params.id);
    const { platform, editedContent, slackChannel, whatsappNumber, whatsappGroup, source_type } = req.body;
    console.log("📨 Approve request - ID:", id, "| platform:", platform, "| source:", source_type);

    if (!id || isNaN(id)) return fail(res, 400, "Valid ID is required");

    let msg, finalContent;

    if (source_type === 'whatsapp') {
      const msgResult = await query("SELECT * FROM whatsapp_messages WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
      if (!msgResult.rows.length) return fail(res, 404, "WhatsApp message not found");
      msg = msgResult.rows[0];
      finalContent = editedContent || msg.body;
      if (msg.forwarded_to_teams) {
        return ok(res, { sent: true, duplicate: true, platform, source_type: 'whatsapp' }, { message: "Already forwarded" });
      }
    } else {
      const msgResult = await query("SELECT *, files::text as files_text FROM teams_messages WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
      if (!msgResult.rows.length) return fail(res, 404, "Teams message not found");
      msg = msgResult.rows[0];
      finalContent = editedContent || msg.approved_draft || msg.body;
    }

    const cleanContent = finalContent.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
    let sendResult = null;
    let sendError = null;

    // ─── Send to Slack ────────────────────────────────────────────────────────
    if (platform === "slack") {
      try {
        const channel = slackChannel || msg.recipient_slack_id || process.env.SLACK_CHANNEL_1 || process.env.SLACK_DEFAULT_CHANNEL;
        if (!channel) throw new Error("No Slack channel found for this message. Check channel_mappings.");
        console.log("📤 Sending to Slack channel:", channel);

        let files = [];
        if (source_type !== 'whatsapp') {
          try {
            files = msg.files_text ? JSON.parse(msg.files_text) : [];
            files = files.filter(f => f.url && f.name);
          } catch { files = []; }
        }

        if (files.length > 0) {
          console.log(`📎 Forwarding ${files.length} file(s) to Slack`);
          sendResult = await sendSlackMessageWithFiles(channel, cleanContent, files, { sender: msg.sender });
        } else {
          sendResult = await sendSlackMessage(channel, cleanContent, { sender: msg.sender });
        }
      } catch (err) {
        sendError = err.message;
        console.error("❌ Slack send failed:", err.message);
      }
    }

    // ─── Send to WhatsApp ─────────────────────────────────────────────────────
    if (platform === "whatsapp") {
      try {
        const targetGroup = whatsappGroup || 'Test grp';
        console.log(`📤 Forwarding to WhatsApp group: ${targetGroup}`);
        let imageLabel = '';

        let mediaUrl = null;
        try {
          let files = [];
          if (msg.files_text) { try { files = JSON.parse(msg.files_text); } catch { files = []; } }
          const imageFile = files.find(f => f && f.url && f.name &&
            /\.(png|jpe?g|gif|webp)$/i.test(f.name));
          if (imageFile) {
            mediaUrl = imageFile.publicUrl || imageFile.url;
            imageLabel = `${imageFile.name}\n`;
            console.log(`📸 Found image: ${imageFile.name}`);
          }
        } catch {}

       const formattedMessage = `*From Appsrow*\n${cleanContent}`.replace(/\n{3,}/g, "\n\n");

        try {
          sendResult = await whatsappBot.sendToGroup(targetGroup, formattedMessage, mediaUrl);
        } catch (err) {
          console.error('❌ WhatsApp group send failed:', err.message);
          sendError = err.message;
          sendResult = { success: false };
        }

        if (sendResult?.success) {
          await query(
            `INSERT INTO whatsapp_messages (tenant_id, sender, sender_phone, body, timestamp, direction, group_name, batch_scanned, forwarded_to_teams)
             VALUES ($1, $2, $3, $4, $5, 'outbound', $6, TRUE, TRUE)`,
            [tenantId, 'System (Teams Forward)', 'teams-forward', formattedMessage, new Date().toISOString(), targetGroup]
          );
        } else {
          sendError = sendError || "Failed to send to WhatsApp group";
        }
      } catch (err) {
        sendError = err.message;
        console.error("❌ WhatsApp send failed:", err.message);
      }
    }

    if (sendError || !sendResult) {
      return fail(res, 502, "Approval send failed", {
        details: sendError || "No delivery result",
        meta: { platform, source_type: source_type || 'teams', sent: false },
      });
    }

    if (source_type === 'whatsapp') {
      await query(`UPDATE whatsapp_messages SET forwarded_to_teams = true WHERE id = $1 AND tenant_id = $2`, [id, tenantId]);
    } else {
      await query(
        `UPDATE teams_messages
         SET approval_status = 'approved', suggested_platform = $2, approved_draft = $3
         WHERE id = $1 AND tenant_id = $4`,
        [id, platform || "slack", finalContent, tenantId]
      );
    }

    return ok(res, { sent: true, platform, source_type: source_type || 'teams' }, { message: "Approved" });
  } catch (error) {
    console.error("Approve error:", error);
    return fail(res, 500, "Approval failed", { details: error.message });
  }
});

// ─── POST /api/messages/ignore/:id ───────────────────────────────────────────
router.post("/ignore/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = parseInt(req.params.id);
    if (!id || isNaN(id)) return fail(res, 400, "Valid ID is required");
    await query("UPDATE teams_messages SET approval_status = 'ignored' WHERE id = $1 AND tenant_id = $2", [id, tenantId]);
    return ok(res, { id, ignored: true }, { message: "Ignored" });
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

// ─── GET /api/messages/contacts ───────────────────────────────────────────────
router.get("/contacts", async (req, res) => {
  try {
    const result = await query("SELECT * FROM contacts WHERE tenant_id = $1 ORDER BY name", [req.tenantId]);
    return ok(res, result.rows);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// ─── POST /api/messages/contacts ─────────────────────────────────────────────
router.post("/contacts", async (req, res) => {
  try {
    const { name, email, slack_user_id, slack_channel, whatsapp_number, notes } = req.body;
    if (!name || !String(name).trim()) return fail(res, 400, "name is required");
    const result = await query(
      `INSERT INTO contacts (tenant_id, name, email, slack_user_id, slack_channel, whatsapp_number, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.tenantId, name, email || null, slack_user_id || null, slack_channel || null, whatsapp_number || null, notes || null]
    );
    return ok(res, result.rows[0], { status: 201 });
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// ─── DELETE /api/messages/contacts/:id ───────────────────────────────────────
router.delete("/contacts/:id", async (req, res) => {
  try {
    await query("DELETE FROM contacts WHERE id = $1 AND tenant_id = $2", [req.params.id, req.tenantId]);
    return ok(res, { deleted: true }, { message: "Deleted" });
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

// ─── GET /api/messages/whatsapp-groups ───────────────────────────────────────
router.get("/whatsapp-groups", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const result = await query(`
      SELECT DISTINCT group_name AS name, COUNT(*) AS message_count
      FROM whatsapp_messages
      WHERE tenant_id = $2 AND group_name = ANY($1) AND direction = 'inbound'
      GROUP BY group_name ORDER BY group_name
    `, [SELECTED_WHATSAPP_GROUPS, tenantId]);

    const groups = SELECTED_WHATSAPP_GROUPS.map(name => ({
      id: name, name,
      participants: result.rows.find(r => r.name === name)?.message_count || 0
    }));
    return ok(res, groups);
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

// ─── GET /api/messages/teams/list ────────────────────────────────────────────
router.get("/teams/list", async (req, res) => {
  try {
    const token = await getAccessToken();
    const response = await fetch("https://graph.microsoft.com/beta/teams", {
      headers: { Authorization: `Bearer ${token}` },
    });
    return ok(res, await response.json());
  } catch (error) {
    return fail(res, 500, error.message);
  }
});

// ─── POST /api/messages/drafts/:id/approve ───────────────────────────────────
router.post("/drafts/:id/approve", async (req, res) => {
  try {
    const draftId = parseInt(req.params.id);
    if (!draftId || isNaN(draftId)) return res.status(400).json({ error: "Valid draft ID is required" });
    const { approvedText } = req.body;
    const updated = await approveDraft({ draftId, approvedText });
    return res.status(200).json({ message: "Draft approved", draft: updated });
  } catch (error) {
    const status = error.message.includes("not found") ? 404 : 500;
    return res.status(status).json({ error: error.message });
  }
});

// ─── PATCH /api/messages/drafts/:id ──────────────────────────────────────────
router.patch("/drafts/:id", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const id = parseInt(req.params.id);
    const { content } = req.body;
    if (!id || isNaN(id)) return res.status(400).json({ error: "Valid ID is required" });
    await query("UPDATE teams_messages SET approved_draft = $1 WHERE id = $2 AND tenant_id = $3", [content, id, tenantId]);
    return res.status(200).json({ message: "Draft updated" });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;