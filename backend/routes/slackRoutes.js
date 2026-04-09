import express from "express";
import { query } from "../db/index.js";
import { WebClient } from "@slack/web-api";
import { sendToGroupChat } from "../services/teamsService.js";
import { uploadSlackFileToSupabase } from "../services/storageService.js";
import { resolveSlackChannel } from "../utils/slackMapper.js";
import { handleSlackThreadEvent } from "../services/slackThreadTracker.js";
//slackRoutes.js - handles Slack events, message storage, and forwarding to Teams
const router = express.Router();
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "tenant-default";

router.get("/channels", async (req, res) => {
  try {
    const result = await slack.conversations.list({ types: "public_channel" });
    const channels = (result.channels || []).map((c) => ({ id: c.id, name: c.name }));
    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Slack channels" });
  }
});

router.get("/messages", async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const result = await query(
      `SELECT id, sender, channel_id, channel_name, body, timestamp, 
              COALESCE(forwarded_to_teams, false) AS forwarded_to_teams,
              COALESCE(files, '[]') AS files
       FROM slack_messages
       WHERE tenant_id = $1
       AND (dismissed IS NULL OR dismissed = FALSE)
       ORDER BY timestamp DESC
       LIMIT 200`
      , [tenantId]
    );

    const rows = result.rows.map((row) => ({
      id: row.id,
      sender: row.sender,
      sender_id: row.sender,
      body: row.body,
      timestamp: row.timestamp,
      channel_id: row.channel_id || row.channel_name,
      channel_name: resolveSlackChannel(row.channel_id, row.channel_name),
      forwarded_to_teams: row.forwarded_to_teams,
      files: row.files,
    }));

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch Slack messages" });
  }
});

router.post("/events", async (req, res) => {
  const { type, challenge, event } = req.body;

  if (type === "url_verification") return res.json({ challenge });

  res.sendStatus(200);

  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    if (type !== "event_callback" || !event) return;
    if (event.type !== "message") return;
    if (event.subtype && event.subtype !== "file_share") return;

    const hasText = !!event.text;
    const hasFiles = Array.isArray(event.files) && event.files.length > 0;
    if (!hasText && !hasFiles) return;

    const sender = event.user || "unknown";
    const channelId = event.channel;
    const body = event.text || "";
    const timestamp = event.ts
      ? new Date(parseFloat(event.ts) * 1000).toISOString()
      : new Date().toISOString();

    let channelName = resolveSlackChannel(channelId, null);
    try {
      const info = await slack.conversations.info({ channel: channelId });
      channelName = resolveSlackChannel(channelId, info.channel?.name || null);
    } catch {}

    let senderName = sender;
    try {
      const userInfo = await slack.users.info({ user: sender });
      senderName =
        userInfo.user?.profile?.display_name ||
        userInfo.user?.real_name ||
        userInfo.user?.name ||
        sender;
    } catch {}

    const existing = await query(
      `SELECT id FROM slack_messages WHERE tenant_id = $1 AND channel_id = $2 AND timestamp = $3`,
      [tenantId, channelId, timestamp]
    );
    if (existing.rows.length > 0) return;

    const files = [];
    if (hasFiles) {
      for (const f of event.files) {
        const url = f.url_private_download || f.url_private;
        if (!url) continue;
        const publicUrl = await uploadSlackFileToSupabase(url, f.name || f.id, f.mimetype);
        files.push({ name: f.name || f.id, url, publicUrl, contentType: f.mimetype });
        if (publicUrl) console.log(`📎 Slack file saved: ${f.name} → ${publicUrl}`);
      }
    }

    const insertResult = await query(
      `INSERT INTO slack_messages (tenant_id, sender, channel_id, channel_name, body, timestamp, forwarded_to_teams, files)
       VALUES ($1, $2, $3, $4, $5, $6, false, $7) RETURNING id`,
      [tenantId, senderName, channelId, channelName, body, timestamp, JSON.stringify(files)]
    );

    const savedId = insertResult.rows[0]?.id;
    console.log(`✅ Slack message saved: [${channelName}] ${senderName}: ${body.slice(0, 60)}`);

    // ─── 2-Way Communication Logic ──────────────────────────────────────────
    const lowerText = body.toLowerCase();
    if (lowerText.startsWith("#teams")) {
      console.log(`🔀 Slack -> Teams 2-Way Command detected: ${body}`);
      const parts = body.trim().split(' ');
      if (parts.length >= 3) {
        const teamsTarget = parts[1]; // Chat name or ID
        const messageText = parts.slice(2).join(' ');
        
        // Try to find conversation ID from our store
        const { rows: convs } = await query(
          `SELECT conversation_id FROM teams_conversations 
           WHERE tenant_id = $2 AND (conversation_name ILIKE $1 OR conversation_id = $1) LIMIT 1`,
          [`%${teamsTarget}%`, tenantId]
        );

        if (convs.length > 0) {
          const formatted = `*From Slack (#${channelName})*\n*${senderName}:*\n\n${messageText}`;
          await sendToGroupChat(convs[0].conversation_id, formatted)
            .then(() => console.log(`✅ 2-Way: Slack -> Teams (${teamsTarget})`))
            .catch(err => console.error(`❌ 2-Way: Slack -> Teams failed:`, err.message));
        } else {
          console.warn(`⚠️ Teams target "${teamsTarget}" not found in conversation store.`);
        }
      }
    }

    // ← ADD THIS BLOCK
    if (savedId) {  
      const links = body.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/g) || [];
      const { runAgentAnalysis } = await import('../agent/openclawAgent.js');
        runAgentAnalysis({
        source: 'slack',
        sender: senderName,
        content: body,
        messageId: savedId,
        channelId,
        channelName,
      }).catch(err => console.error('OpenClaw Slack error:', err.message));

      if (links.length > 0) {
        fetch(`http://localhost:${process.env.PORT || 5000}/api/tasks/detect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "slack",
            source_message_id: savedId,
            client_name: senderName,
            platform_label: resolveSlackChannel(channelId, channelName),
            body,
            images: files.map(f => f.publicUrl || f.url),
          }),
        }).catch(() => {});
      }

      // ── Thread Tracker ──────────────────────────────────────────────
      handleSlackThreadEvent(event, { channelId, channelName, senderName })
      .catch(err => console.error('Thread tracker error:', err.message));
    }
  } catch (err) {
    console.error("❌ Slack event error:", err.message);
  }
});

router.post("/fetch-today", async (req, res) => {
  const tenantId = req.tenantId || DEFAULT_TENANT_ID;
  const CHANNEL_IDS = ["C0AHE5C59NH", "C0AHHG10HDG", "C0AH24BPHRD"];
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const oldest = (todayStart.getTime() / 1000).toString();
  let saved = 0, skipped = 0;

  try {
    for (const channelId of CHANNEL_IDS) {
      let channelName = resolveSlackChannel(channelId, null);
      try {
        const info = await slack.conversations.info({ channel: channelId });
        channelName = resolveSlackChannel(channelId, info.channel?.name || null);
      } catch {}

      let history;
      try {
        history = await slack.conversations.history({ channel: channelId, oldest, limit: 100 });
      } catch (err) {
        console.error(`❌ Failed to fetch history for ${channelId}:`, err.message);
        continue;
      }

      for (const msg of history.messages || []) {
        if (msg.subtype && msg.subtype !== "file_share") continue;
        if (!msg.text && !msg.files) continue;

        const timestamp = new Date(parseFloat(msg.ts) * 1000).toISOString();
        const existing = await query(
          `SELECT id FROM slack_messages WHERE tenant_id = $1 AND channel_id = $2 AND timestamp = $3`,
          [tenantId, channelId, timestamp]
        );
        if (existing.rows.length > 0) { skipped++; continue; }

        let senderName = msg.user || "unknown";
        try {
          const userInfo = await slack.users.info({ user: msg.user });
          senderName =
            userInfo.user?.profile?.display_name ||
            userInfo.user?.real_name ||
            userInfo.user?.name ||
            msg.user;
        } catch {}

        const files = [];
        if (msg.files?.length > 0) {
          for (const f of msg.files) {
            const url = f.url_private_download || f.url_private;
            if (!url) continue;
            const publicUrl = await uploadSlackFileToSupabase(url, f.name || f.id, f.mimetype);
            files.push({ name: f.name || f.id, url, publicUrl, contentType: f.mimetype });
            if (publicUrl) console.log(`📎 Slack file saved: ${f.name} → ${publicUrl}`);
          }
        }

        await query(
          `INSERT INTO slack_messages (tenant_id, sender, channel_id, channel_name, body, timestamp, forwarded_to_teams, files)
           VALUES ($1, $2, $3, $4, $5, $6, false, $7)`,
          [tenantId, senderName, channelId, channelName, msg.text || "", timestamp, JSON.stringify(files)]
        );
        saved++;
      }
    }

    console.log(`✅ Slack fetch-today: ${saved} saved, ${skipped} skipped`);
    res.json({ success: true, saved, skipped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/teams-chats", async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const result = await query(
      `SELECT conversation_id AS id, conversation_name AS name
       FROM teams_conversations
       WHERE tenant_id = $1
       ORDER BY conversation_name`
      , [tenantId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/slack/forward ──────────────────────────────────────────────────
router.post("/forward", async (req, res) => {
  const tenantId = req.tenantId || DEFAULT_TENANT_ID;
  const { msgId, chatId, editedBody } = req.body;
  if (!msgId || !chatId) return res.status(400).json({ error: "msgId and chatId required" });

  try {
    const { rows } = await query(
      `SELECT sender, body, channel_id, channel_name FROM slack_messages WHERE id = $1 AND tenant_id = $2`,
      [msgId, tenantId]
    );
    if (!rows.length) return res.status(404).json({ error: "Message not found" });

    const msg = rows[0];
    const text = editedBody || msg.body;
    const channelDisplay = msg.channel_name || msg.channel_id;
    const formatted = `📨 Slack → Teams\nFrom: ${msg.sender} | ${channelDisplay}\n\n${text}`;

    // ─── Get chat name from DB ─────────────────────────────────────────────
    let chatName = chatId;
    try {
      const chatRes = await query(
        `SELECT conversation_name FROM teams_conversations WHERE conversation_id = $1 AND tenant_id = $2`,
        [chatId, tenantId]
      );
      if (chatRes.rows[0]) chatName = chatRes.rows[0].conversation_name;
    } catch {}

    const sendMeta = await sendToGroupChat(chatId, formatted);

   await query(
    `UPDATE slack_messages SET forwarded_to_teams = true, edited_body = $2, batch_scanned = TRUE WHERE id = $1 AND tenant_id = $3`,
      [msgId, editedBody && editedBody !== msg.body ? editedBody : null, tenantId]
    );

    // ─── Save to teams_messages for Teams section visibility ──────────────
    await query(
      `INSERT INTO teams_messages 
        (tenant_id, sender, body, timestamp, source_type, source_id, chat_name, approval_status, files, links)
       VALUES ($1, $2, $3, NOW(), 'groupChat', $4, $5, 'forwarded', '[]', '[]')`,
      [
        tenantId,
        `${msg.sender} (via Slack)`,
        text,
        chatId,
        chatName
      ]
    ).catch(err => console.error('Failed to mirror to teams_messages:', err.message));

    await query(
      `INSERT INTO tasks
        (tenant_id, source, source_message_id, client_name, platform_label, body, status, teams_activity_id, teams_conversation_id)
       VALUES ($1, 'slack', $2, $3, $4, $5, 'pending', $6, $7)`,
      [tenantId, msgId, msg.sender, channelDisplay, text, sendMeta?.activityId || null, chatId]
    ).catch((err) => console.error("Failed to save Slack-forward task:", err.message));

    console.log(`✅ Slack msg ${msgId} forwarded to Teams chat ${chatId}`);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/slack/forward-image ───────────────────────────────────────────
router.post("/forward-image", async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const { messageId, chatId, publicUrl, caption } = req.body;
    if (!chatId || !publicUrl) return res.status(400).json({ error: "chatId and publicUrl required" });
    console.log(`📤 Forwarding image to Teams: ${publicUrl}`);

    // ─── Get chat name from DB ─────────────────────────────────────────────
    let chatName = chatId;
    try {
      const chatRes = await query(
        `SELECT conversation_name FROM teams_conversations WHERE conversation_id = $1 AND tenant_id = $2`,
        [chatId, tenantId]
      );
      if (chatRes.rows[0]) chatName = chatRes.rows[0].conversation_name;
    } catch {}

    // ─── Get sender info from slack_messages ──────────────────────────────
    let sender = "Slack User";
    let slackBody = "";
    if (messageId) {
      try {
        const msgRes = await query(`SELECT sender, body FROM slack_messages WHERE id = $1 AND tenant_id = $2`, [messageId, tenantId]);
        if (msgRes.rows[0]) { sender = msgRes.rows[0].sender; slackBody = msgRes.rows[0].body; }
      } catch {}
    }

    const { sendImageToGroupChat } = await import("../services/teamsService.js");
    await sendImageToGroupChat(chatId, publicUrl, caption || null);

    if (messageId) {
      await query(
        `UPDATE slack_messages SET forwarded_to_teams = true, batch_scanned = TRUE WHERE id = $1 AND tenant_id = $2`,
        [messageId, tenantId]
      ).catch(() => {});
    }

    // ─── Save to teams_messages for Teams section visibility ──────────────
    const fileName = publicUrl.split("/").pop() || "image";
    await query(
      `INSERT INTO teams_messages 
        (tenant_id, sender, body, timestamp, source_type, source_id, chat_name, approval_status, files, links)
       VALUES ($1, $2, $3, NOW(), 'groupChat', $4, $5, 'forwarded', $6::jsonb, '[]')`,
      [
        tenantId,
        `${sender} (via Slack)`,
        slackBody || caption || "",
        chatId,
        chatName,
        JSON.stringify([{ name: fileName, url: publicUrl, publicUrl, contentType: "image/png" }])
      ]
    ).catch(err => console.error('Failed to mirror image to teams_messages:', err.message));

    console.log(`✅ Slack image forwarded to Teams: ${chatId}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Slack forward-image error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;