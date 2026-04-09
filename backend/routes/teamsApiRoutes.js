import express from "express";
import { query } from "../db/index.js";
import { runAgentAnalysis } from "../agent/openclawAgent.js";
//teamsApiRoutes.js is for handling API requests related to Teams messages, stats, and forwarding to WhatsApp, while teamsRoutes.js is for handling outgoing messages and group chat management, and teamsWebhook.js is for handling incoming messages and notifications from Microsoft Graph.
  const router = express.Router();
  const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "tenant-default";

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

      res.status(200).json({ message: "Teams message stored", data: savedMsg });
    } catch (error) {
      console.error("❌ Teams incoming error:", error);
      res.status(500).json({ error: "Failed to store Teams message", details: error.message });
    }
  });

  // ─── GET /api/teams/messages ───────────────────────────────────────────────────
  router.get("/messages", async (req, res) => {
    try {
      const raw = process.env.MONITORED_CHAT_IDS || "";
      const monitoredChatIds = raw.split(",").map(id => id.trim()).filter(Boolean);

      let result;

      if (monitoredChatIds.length === 0) {
        console.warn("⚠️ MONITORED_CHAT_IDS not set — returning all messages");
        result = await query(`
          SELECT 
            id, sender, body, timestamp, source_type, source_id,
            COALESCE(files, '[]') AS files,
            COALESCE(links, '[]') AS links,
            chat_name
          FROM teams_messages
          WHERE timestamp >= NOW() - INTERVAL '4 days'
          ORDER BY timestamp DESC
          LIMIT 100
        `);
      } else {
        result = await query(`
          SELECT 
            id, sender, body, timestamp, source_id, source_type, chat_name, files, links
          FROM teams_messages
          WHERE source_id = ANY($1)
            AND timestamp >= NOW() - INTERVAL '4 days'
          ORDER BY timestamp DESC
        `, [monitoredChatIds]);
      }

      console.log(`📨 Teams messages: returned ${result.rows.length} rows (filter: ${monitoredChatIds.length > 0 ? monitoredChatIds.join(", ") : "none"})`);
      res.json(result.rows);
    } catch (error) {
      console.error("❌ Teams messages fetch error:", error);
      res.status(500).json({ error: "Failed to fetch Teams messages", details: error.message });
    }
  });

  // ─── GET /api/teams/messages/chats ────────────────────────────────────────────
  router.get("/messages/chats", async (req, res) => {
    try {
      const raw = process.env.MONITORED_CHAT_IDS || "";
      const monitoredChatIds = raw.split(",").map(id => id.trim()).filter(Boolean);
      // ... same logic for backward compatibility if needed ...
      let result;
      if (monitoredChatIds.length === 0) {
        result = await query(`SELECT * FROM teams_messages WHERE timestamp >= NOW() - INTERVAL '4 days' ORDER BY timestamp DESC LIMIT 100`);
      } else {
        result = await query(`SELECT * FROM teams_messages WHERE source_id = ANY($1) AND timestamp >= NOW() - INTERVAL '4 days' ORDER BY timestamp DESC`, [monitoredChatIds]);
      }
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── PATCH /api/teams/messages/:id/dismiss ────────────────────────────────────
  router.patch("/messages/:id/dismiss", async (req, res) => {
    try {
      await query(`UPDATE teams_messages SET dismissed = TRUE WHERE id = $1`, [req.params.id]);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // ─── GET /api/teams/stats ─────────────────────────────────────────────────────
  router.get("/stats", async (req, res) => {
    try {
      const result = await query(
        `SELECT
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE source_type = 'channel') AS "channelMessages",
          COUNT(*) FILTER (WHERE source_type = 'groupChat') AS "chatMessages",
          COUNT(*) FILTER (WHERE files IS NOT NULL AND files != '[]') AS "filesShared"
        FROM teams_messages`
      );
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch stats" });
    }
  });

  // ─── GET /api/teams/whatsapp-groups ───────────────────────────────────────────
  router.get('/whatsapp-groups', async (req, res) => {
    try {
      const { default: whatsappBot } = await import('../services/whatsappBot.js');
      const groups = await whatsappBot.getGroups();
      // getGroups() returns { id, name, participants } — id is already a string
      res.json(groups.map(g => ({ id: g.id, name: g.name })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ─── POST /api/teams/forward-image ───────────────────────────────────────────
  router.post('/forward-image', async (req, res) => {
    try {
      const { messageId, groupName, publicUrl, caption } = req.body;
      if (!groupName || !publicUrl) {
        return res.status(400).json({ error: 'groupName and publicUrl are required' });
      }

      const { default: whatsappBot } = await import('../services/whatsappBot.js');
      await whatsappBot.sendToGroup(groupName, caption || 'Forwarded from Teams', publicUrl);

      if (messageId) {
        await query(
          `UPDATE teams_messages SET approval_status = 'forwarded' WHERE id = $1`,
          [messageId]
        ).catch(() => {});
      }

      console.log(`✅ Image forwarded to WhatsApp: ${groupName}`);
      res.json({ success: true });
    } catch (err) {
      console.error('❌ Forward image error:', err.message);
      res.status(500).json({ error: err.message });
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

