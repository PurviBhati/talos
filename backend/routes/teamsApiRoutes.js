import express from "express";
import { query } from "../db/index.js";
import { runAgentAnalysis } from "../agent/openclawAgent.js";
import { requireTenant } from "../middleware/tenantContext.js";
import { fail, ok } from "../utils/apiResponse.js";
//teamsApiRoutes.js is for handling API requests related to Teams messages, stats, and forwarding to WhatsApp, while teamsRoutes.js is for handling outgoing messages and group chat management, and teamsWebhook.js is for handling incoming messages and notifications from Microsoft Graph.
  const router = express.Router();
  const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "tenant-default";
  const STRICT_TEAMS_CHAT_FILTER = String(process.env.STRICT_TEAMS_CHAT_FILTER || "true").toLowerCase() !== "false";
  const TEAMS_FILTER_BY_MAPPING = String(process.env.TEAMS_FILTER_BY_MAPPING || "true").toLowerCase() !== "false";

  async function getAllowedTeamsChatIds(tenantId = DEFAULT_TENANT_ID) {
    const monitored = String(process.env.MONITORED_CHAT_IDS || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);
    const ids = new Set();
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
      for (const row of mapped.rows) {
        const id = String(row.teams_chat_id || "").trim();
        if (id) ids.add(id);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to load mapped Teams chat ids for API filter: ${err.message}`);
    }
    if (ids.size === 0 && monitored.length > 0) {
      monitored.forEach((id) => ids.add(id));
    }

    return Array.from(ids);
  }

  router.use(requireTenant);

  // ─── POST /api/teams/incoming ─────────────────────────────────────────────────
  router.post("/incoming", async (req, res) => {
    try {
      const body = req.body;
      const messageText = body?.text || body?.body?.content || "No message content";
      const sender      = body?.from?.user?.displayName || body?.sender || "Teams User";
      const chatName    = body?.chatInfo?.topic || body?.channelInfo?.channelName || body?.chatName || null;
      const sourceType  = body?.chatInfo ? "groupChat" : body?.channelInfo ? "channel" : "groupChat";
      const sourceId    = body?.chatInfo?.id || body?.channelInfo?.channelId || body?.id || null;

      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      const result = await query(
        `INSERT INTO teams_messages (tenant_id, sender, body, source_type, source_id, chat_name, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *`,
        [tenantId, sender, messageText, sourceType, sourceId, chatName]
      );

      const savedMsg = result.rows[0];
      runAgentAnalysis({ source: "teams", sender, content: messageText, messageId: savedMsg.id })
        .catch(err => console.error("❌ Agent error:", err.message));

      return ok(res, savedMsg, { message: "Teams message stored" });
    } catch (error) {
      console.error("❌ Teams incoming error:", error);
      return fail(res, 500, "Failed to store Teams message", { details: error.message });
    }
  });

  // ─── GET /api/teams/messages ───────────────────────────────────────────────────
  router.get("/messages", async (req, res) => {
    try {
      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      const allowedChatIds = await getAllowedTeamsChatIds(tenantId);
      let result;

      if (STRICT_TEAMS_CHAT_FILTER && allowedChatIds.length === 0) {
        console.warn("⛔ Strict Teams filter enabled with no allowed chats; returning empty Teams messages list");
        result = { rows: [] };
      } else if (allowedChatIds.length > 0) {
        result = await query(
          `SELECT 
             id, sender, body, timestamp, source_id, source_type, chat_name, files, links
           FROM teams_messages
           WHERE tenant_id = $1
             AND source_id = ANY($2)
             AND timestamp >= NOW() - INTERVAL '4 days'
           ORDER BY timestamp DESC`,
          [tenantId, allowedChatIds]
        );
      } else {
        result = await query(
          `SELECT 
             id, sender, body, timestamp, source_type, source_id,
             COALESCE(files, '[]') AS files,
             COALESCE(links, '[]') AS links,
             chat_name
           FROM teams_messages
           WHERE tenant_id = $1
             AND timestamp >= NOW() - INTERVAL '4 days'
           ORDER BY timestamp DESC
           LIMIT 100`,
          [tenantId]
        );
      }

      console.log(`📨 Teams messages: returned ${result.rows.length} rows (allowed chats: ${allowedChatIds.length})`);
      return ok(res, result.rows);
    } catch (error) {
      console.error("❌ Teams messages fetch error:", error);
      return fail(res, 500, "Failed to fetch Teams messages", { details: error.message });
    }
  });

  // ─── GET /api/teams/messages/chats ────────────────────────────────────────────
  router.get("/messages/chats", async (req, res) => {
    try {
      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      const allowedChatIds = await getAllowedTeamsChatIds(tenantId);
      let result;
      if (STRICT_TEAMS_CHAT_FILTER && allowedChatIds.length === 0) {
        result = { rows: [] };
      } else if (allowedChatIds.length > 0) {
        result = await query(
          `SELECT * FROM teams_messages
           WHERE tenant_id = $1
             AND source_id = ANY($2)
             AND timestamp >= NOW() - INTERVAL '4 days'
           ORDER BY timestamp DESC`,
          [tenantId, allowedChatIds]
        );
      } else {
        result = await query(
          `SELECT * FROM teams_messages
           WHERE tenant_id = $1
             AND timestamp >= NOW() - INTERVAL '4 days'
           ORDER BY timestamp DESC
           LIMIT 100`,
          [tenantId]
        );
      }
      return ok(res, result.rows);
    } catch (error) {
      return fail(res, 500, error.message);
    }
  });

  // ─── PATCH /api/teams/messages/:id/dismiss ────────────────────────────────────
  router.patch("/messages/:id/dismiss", async (req, res) => {
    try {
      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      await query(`UPDATE teams_messages SET dismissed = TRUE WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
      return ok(res, { id: Number(req.params.id), dismissed: true });
    } catch (error) {
      return fail(res, 500, error.message);
    }
  });

  // ─── GET /api/teams/stats ─────────────────────────────────────────────────────
  router.get("/stats", async (req, res) => {
    try {
      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      const result = await query(
        `SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE source_type = 'channel') AS "channelMessages",
          COUNT(*) FILTER (WHERE source_type = 'groupChat') AS "chatMessages",
          COUNT(*) FILTER (WHERE files IS NOT NULL AND files != '[]') AS "filesShared"
        FROM teams_messages
        WHERE tenant_id = $1`,
        [tenantId]
      );
      return ok(res, result.rows[0]);
    } catch (error) {
      return fail(res, 500, "Failed to fetch stats");
    }
  });

  // ─── GET /api/teams/whatsapp-groups ───────────────────────────────────────────
  router.get('/whatsapp-groups', async (req, res) => {
    try {
      const { default: whatsappBot } = await import('../services/whatsappBot.js');
      const groups = await whatsappBot.getGroups();
      // getGroups() returns { id, name, participants } — id is already a string
      return ok(res, groups.map(g => ({ id: g.id, name: g.name })));
    } catch (err) {
      return fail(res, 500, err.message);
    }
  });

  // ─── POST /api/teams/forward-image ───────────────────────────────────────────
  router.post('/forward-image', async (req, res) => {
    try {
      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      const { messageId, groupName, publicUrl, caption } = req.body;
      if (!groupName || !publicUrl) {
        return fail(res, 400, 'groupName and publicUrl are required');
      }

      const { default: whatsappBot } = await import('../services/whatsappBot.js');
      await whatsappBot.sendToGroup(groupName, caption || 'Forwarded from Teams', publicUrl);

      if (messageId) {
        await query(
          `UPDATE teams_messages SET approval_status = 'forwarded' WHERE id = $1 AND tenant_id = $2`,
          [messageId, tenantId]
        );
      }

      console.log(`✅ Image forwarded to WhatsApp: ${groupName}`);
      return ok(res, { forwarded: true, groupName });
    } catch (err) {
      console.error('❌ Forward image error:', err.message);
      return fail(res, 500, err.message);
    }
  });

  // ─── GET /api/teams/proxy-image ───────────────────────────────────────────────
  router.get("/proxy-image", async (req, res) => {
    const { url } = req.query;
    if (!url) return res.status(400).send("No URL");
    try {
      const response = await fetch(decodeURIComponent(url));
      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.send(buffer);
    } catch (err) {
      res.status(500).send("Proxy error");
    }
  });

  export default router;

