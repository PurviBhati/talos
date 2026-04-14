import express from 'express';
import { query as db } from '../db/index.js';
import { sendWhatsApp } from '../tools/sendWhatsApp.js';
import { runAgentAnalysis } from '../agent/openclawAgent.js';
import { SELECTED_WHATSAPP_GROUPS } from '../config/whatsappGroups.js';

const router = express.Router();
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "tenant-default";

function parseWhatsappJidMap() {
  try {
    const raw = process.env.WHATSAPP_GROUP_JID_MAP;
    if (!raw || !String(raw).trim()) return {};
    return JSON.parse(raw);
  } catch {
    console.warn("⚠️ WHATSAPP_GROUP_JID_MAP is not valid JSON — ignored");
    return {};
  }
}

function resolveTwilioWhatsAppGroupName({ from, body, profileName }) {
  const map = parseWhatsappJidMap();
  const jid = (from || "").trim();
  if (map[jid]) return map[jid];

  const bodyL = (body || "").toLowerCase();
  const senderL = (profileName || "").toLowerCase();
  for (const grp of SELECTED_WHATSAPP_GROUPS) {
    const g = grp.toLowerCase();
    if (bodyL.includes(g) || senderL.includes(g)) return grp;
  }

  if (jid.includes("@g.us")) {
    console.warn(`⚠️ Unmapped WhatsApp group JID "${jid}" — add it to WHATSAPP_GROUP_JID_MAP`);
    return "__UNMAPPED_GROUP__";
  }
  return profileName || from || "Direct Chat";
}

// ─── POST /api/whatsapp/webhook (Twilio inbound) ─────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const incomingMessage = {
      from: req.body?.From || '',
      senderName: req.body?.ProfileName || req.body?.From || 'Unknown',
      body: req.body?.Body || '',
      messageSid: req.body?.MessageSid || '',
      timestamp: new Date().toISOString(),
      mediaUrls: req.body?.NumMedia && Number(req.body.NumMedia) > 0
        ? Array.from({ length: Number(req.body.NumMedia) }, (_, i) => req.body[`MediaUrl${i}`]).filter(Boolean)
        : []
    };

    const groupName = resolveTwilioWhatsAppGroupName({
      from: incomingMessage.from,
      body: incomingMessage.body,
      profileName: incomingMessage.senderName,
    });

    const result = await db(
      `INSERT INTO whatsapp_messages 
        (tenant_id, sender, sender_phone, body, message_sid, timestamp, media_urls, direction, group_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'inbound', $8)
       RETURNING id`,
      [
        tenantId,
        incomingMessage.senderName,
        incomingMessage.from,
        incomingMessage.body,
        incomingMessage.messageSid,
        incomingMessage.timestamp,
        JSON.stringify(incomingMessage.mediaUrls),
        groupName
      ]
    );

    const messageId = result.rows[0]?.id;
    const links = (incomingMessage.body || '').match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [];
    const hasMedia = incomingMessage.mediaUrls?.length > 0;
    const routableGroup = groupName && !groupName.startsWith("__") && SELECTED_WHATSAPP_GROUPS.includes(groupName);
    if ((links.length > 0 || hasMedia) && routableGroup) {
      fetch(`http://localhost:${process.env.PORT || 5000}/api/tasks/detect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: 'whatsapp',
          source_message_id: messageId,
          client_name: incomingMessage.senderName || 'Unknown',
          platform_label: groupName,
          body: incomingMessage.body || '',
          images: incomingMessage.mediaUrls || [],
        }),
      }).catch(() => {});
    }

    if (routableGroup && ((incomingMessage.body && incomingMessage.body.trim()) || hasMedia)) {
      runAgentAnalysis({
        source: 'whatsapp',
        sender: incomingMessage.senderName,
        content: (incomingMessage.body && incomingMessage.body.trim()) ? incomingMessage.body : '[media-only message]',
        messageId,
        mediaUrls: incomingMessage.mediaUrls || [],
      }).catch(err => console.error('OpenClaw error:', err.message));
    }

    res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error.message);
    res.status(500).send('Error processing message');
  }
});

// ─── GET /api/whatsapp/messages ───────────────────────────────────────────────
// Last 24h to avoid timezone issues with CURRENT_DATE
router.get('/messages', async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const result = await db(
      `SELECT id, sender, sender_phone, body, message_sid,
              timestamp, media_urls, direction, group_name, forwarded_to_teams
       FROM whatsapp_messages 
       WHERE tenant_id = $1
         AND (dismissed IS NULL OR dismissed = FALSE)
         AND timestamp >= NOW() - INTERVAL '24 hours'
       ORDER BY timestamp DESC
       LIMIT 200`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (error) {
    console.error('❌ Fetch WhatsApp messages error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/whatsapp/forward ───────────────────────────────────────────────
router.post('/forward', async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const { msgId, chatId, editedBody, editedContent } = req.body;
    const content = editedBody || editedContent;
    if (!msgId || !chatId) return res.status(400).json({ error: 'msgId and chatId required' });
    if (!content) return res.status(400).json({ error: 'editedBody is required' });

    const { rows } = await db('SELECT * FROM whatsapp_messages WHERE id = $1 AND tenant_id = $2', [msgId, tenantId]);
    if (!rows.length) return res.status(404).json({ error: 'Message not found' });

    const msg = rows[0];
    const formatted = `*From Appsrow*\n${msg.sender} | ${msg.group_name || 'WhatsApp'}\n\n${content}`;

    const { sendToGroupChat } = await import('../services/teamsService.js');
    const sendMeta = await sendToGroupChat(chatId, formatted);

    await db('UPDATE whatsapp_messages SET forwarded_to_teams = true, batch_scanned = TRUE WHERE id = $1 AND tenant_id = $2', [msgId, tenantId]);
    await db('UPDATE whatsapp_messages SET batch_scanned = TRUE WHERE id = $1 AND tenant_id = $2', [msgId, tenantId]);

    await db(
      `INSERT INTO tasks
        (tenant_id, source, source_message_id, client_name, platform_label, body, status, teams_activity_id, teams_conversation_id)
       VALUES ($1, 'whatsapp', $2, $3, $4, $5, 'pending', $6, $7)`,
      [tenantId, msgId, msg.sender, msg.group_name || 'whatsapp', content, sendMeta?.activityId || null, chatId]
    ).catch((err) => console.error("Failed to save WhatsApp-forward task:", err.message));
    console.log(`✅ WhatsApp msg ${msgId} forwarded to Teams chat ${chatId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Forward WhatsApp message error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/whatsapp/forward-image ────────────────────────────────────────
router.post('/forward-image', async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const { messageId, chatId, mediaUrl, caption } = req.body;
    if (!chatId || !mediaUrl) return res.status(400).json({ error: 'chatId and mediaUrl required' });

    console.log(`📤 Forwarding WhatsApp image to Teams: ${mediaUrl}`);
    const { sendImageToGroupChat } = await import('../services/teamsService.js');
    await sendImageToGroupChat(chatId, mediaUrl, caption || null);

    if (messageId) {
      await db('UPDATE whatsapp_messages SET forwarded_to_teams = true, batch_scanned = TRUE WHERE id = $1 AND tenant_id = $2', [messageId, tenantId]).catch(() => {});
    }

    console.log(`✅ WhatsApp image forwarded to Teams: ${chatId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ WhatsApp forward-image error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ─── POST /api/whatsapp/send ──────────────────────────────────────────────────
router.post('/send', async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const { to, message, mediaUrl } = req.body;
    if (!to || !message) return res.status(400).json({ error: 'to and message are required' });
    const result = await sendWhatsApp(to, message, { mediaUrl });
    if (result.success) {
      await db(
        `INSERT INTO whatsapp_messages (tenant_id, sender, sender_phone, body, message_sid, timestamp, direction)
         VALUES ($1, $2, $3, $4, $5, $6, 'outbound')`,
        [tenantId, 'System', to, message, result.messageSid, result.sentAt]
      );
      res.json({ success: true, result });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/whatsapp/contacts ───────────────────────────────────────────────
router.get('/contacts', async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const result = await db(
      `SELECT DISTINCT sender, sender_phone FROM whatsapp_messages WHERE tenant_id = $1 AND direction = 'inbound' ORDER BY sender`,
      [tenantId]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ─── GET /api/whatsapp/test ───────────────────────────────────────────────────
router.get('/test', async (req, res) => {
  try {
    const result = await db('SELECT COUNT(*) as count FROM whatsapp_messages WHERE tenant_id = $1', [req.tenantId || DEFAULT_TENANT_ID]);
    res.json({ message: 'WhatsApp routes working', totalMessages: result.rows[0].count, groups: SELECTED_WHATSAPP_GROUPS });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/simple-test', (req, res) => {
  res.json({ message: 'Simple test route works!', groups: SELECTED_WHATSAPP_GROUPS });
});

export default router;
