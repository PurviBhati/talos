import express from 'express';
import twilio from 'twilio';
import { query as db } from '../db/index.js';
import { sendWhatsApp } from '../tools/sendWhatsApp.js';
import { runAgentAnalysis } from '../agent/openclawAgent.js';
import { SELECTED_WHATSAPP_GROUPS } from '../config/whatsappGroups.js';
import { requireTenant } from '../middleware/tenantContext.js';
import { fail, ok } from '../utils/apiResponse.js';
import { isMutedSenderForGroup } from '../utils/whatsappMute.js';

const router = express.Router();
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "tenant-default";
const whatsappMessagesCache = new Map();

function getTwilioWebhookUrl(req) {
  return String(
    process.env.TWILIO_WEBHOOK_URL ||
    `${req.protocol}://${req.get('host')}${req.originalUrl}`
  ).trim();
}

function isValidTwilioRequest(req) {
  const authToken = String(process.env.TWILIO_AUTH_TOKEN || '').trim();
  const signature = req.headers['x-twilio-signature'];
  if (!authToken || !signature) return false;
  return twilio.validateRequest(authToken, String(signature), getTwilioWebhookUrl(req), req.body || {});
}

function isTemporaryDbError(error) {
  const code = String(error?.code || '').toUpperCase();
  const msg = String(error?.message || '').toLowerCase();
  return (
    code === 'DB_BACKOFF_ACTIVE' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    msg.includes('temporarily unavailable') ||
    msg.includes('connection terminated') ||
    msg.includes('dbhandler')
  );
}

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

async function getAllowedWhatsAppGroups(tenantId = DEFAULT_TENANT_ID) {
  try {
    const mapped = await db(
      `SELECT whatsapp_group_name
       FROM channel_mappings
       WHERE tenant_id = $1
         AND active = true
         AND whatsapp_group_name IS NOT NULL
         AND whatsapp_group_name != ''`,
      [tenantId]
    );
    const groups = mapped.rows
      .map((row) => String(row.whatsapp_group_name || "").trim())
      .filter(Boolean);
    if (groups.length > 0) return groups;
  } catch (err) {
    console.warn(`⚠️ Failed to load mapped WhatsApp groups, falling back to config: ${err.message}`);
  }
  return SELECTED_WHATSAPP_GROUPS;
}

// ─── POST /api/whatsapp/webhook (Twilio inbound) ─────────────────────────────
router.post('/webhook', async (req, res) => {
  try {
    if (!isValidTwilioRequest(req)) {
      return fail(res, 403, 'Invalid Twilio signature');
    }

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

    let result;
    try {
      result = await db(
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
    } catch (insertErr) {
      if (insertErr?.code === '23505') {
        return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
      }
      throw insertErr;
    }

    const messageId = result.rows[0]?.id;
    if (!messageId) {
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

    const mutedSender = isMutedSenderForGroup(incomingMessage.senderName, groupName, incomingMessage.from);
    if (mutedSender) {
      await db(
        `UPDATE whatsapp_messages
         SET batch_scanned = TRUE,
             ai_should_forward = FALSE,
             ai_category = 'muted_sender',
             ai_priority = 'low',
             ai_reason = 'Muted sender in this group by user rule'
         WHERE id = $1 AND tenant_id = $2`,
        [messageId, tenantId]
      ).catch(() => {});
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }

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
    if (isTemporaryDbError(error)) {
      console.warn('⚠️ WhatsApp webhook accepted during temporary DB outage:', error.message);
      return res.status(200).send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
    }
    console.error('❌ WhatsApp webhook error:', error.message);
    res.status(500).send('Error processing message');
  }
});

router.use(requireTenant);

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// ─── GET /api/whatsapp/messages ───────────────────────────────────────────────
// Default is 7 days so backlogged messages remain visible after outages/restarts.
router.get('/messages', async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const allowedGroups = await getAllowedWhatsAppGroups(tenantId);
    if (!allowedGroups.length) return ok(res, []);
    const hours = clampInt(req.query?.hours, 168, 1, 24 * 30);
    const limit = clampInt(req.query?.limit, 500, 50, 2000);
    const includeDismissed = String(req.query?.includeDismissed || '').toLowerCase() === 'true';
    const result = await db(
      `SELECT id, sender, sender_phone, body, message_sid,
              timestamp, media_urls, direction, group_name, forwarded_to_teams
       FROM whatsapp_messages 
       WHERE tenant_id = $1
         AND ($2::boolean = TRUE OR dismissed IS NULL OR dismissed = FALSE)
         AND timestamp >= NOW() - ($3::int * INTERVAL '1 hour')
         AND direction = 'inbound'
         AND group_name = ANY($5)
       ORDER BY timestamp DESC
       LIMIT $4`,
      [tenantId, includeDismissed, hours, limit, allowedGroups]
    );
    whatsappMessagesCache.set(tenantId, result.rows);
    return ok(res, result.rows);
  } catch (error) {
    if (isTemporaryDbError(error)) {
      const tenantId = req.tenantId || DEFAULT_TENANT_ID;
      const cached = whatsappMessagesCache.get(tenantId);
      if (Array.isArray(cached)) {
        console.warn('⚠️ Returning cached WhatsApp messages due to temporary DB outage');
        return ok(res, cached);
      }
      console.warn('⚠️ WhatsApp messages unavailable due to temporary DB outage (no cache)');
      return fail(res, 503, 'WhatsApp messages temporarily unavailable (database reconnecting). Please retry shortly.');
    }
    console.error('❌ Fetch WhatsApp messages error:', error);
    return fail(res, 500, error.message);
  }
});

// ─── POST /api/whatsapp/forward ───────────────────────────────────────────────
router.post('/forward', async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const { msgId, chatId, editedBody, editedContent } = req.body;
    const content = editedBody || editedContent;
    if (!msgId || !chatId) return fail(res, 400, 'msgId and chatId required');
    if (!content) return fail(res, 400, 'editedBody is required');

    const { rows } = await db('SELECT * FROM whatsapp_messages WHERE id = $1 AND tenant_id = $2', [msgId, tenantId]);
    if (!rows.length) return fail(res, 404, 'Message not found');

    const msg = rows[0];
    if (msg.forwarded_to_teams) {
      return ok(res, { forwarded: true, duplicate: true });
    }
    const formatted = `*From Appsrow*\n${msg.sender} | ${msg.group_name || 'WhatsApp'}\n\n${content}`;

    const { sendToGroupChat } = await import('../services/teamsService.js');
    const sendMeta = await sendToGroupChat(chatId, formatted, { tenantId });

    await db('UPDATE whatsapp_messages SET forwarded_to_teams = true, batch_scanned = TRUE WHERE id = $1 AND tenant_id = $2', [msgId, tenantId]);

    await db(
      `INSERT INTO tasks
        (tenant_id, source, source_message_id, client_name, platform_label, body, status, teams_activity_id, teams_conversation_id)
       VALUES ($1, 'whatsapp', $2, $3, $4, $5, 'pending', $6, $7)`,
      [tenantId, msgId, msg.sender, msg.group_name || 'whatsapp', content, sendMeta?.activityId || null, chatId]
    ).catch((err) => console.error("Failed to save WhatsApp-forward task:", err.message));
    console.log(`✅ WhatsApp msg ${msgId} forwarded to Teams chat ${chatId}`);
    return ok(res, { forwarded: true, activityId: sendMeta?.activityId || null });
  } catch (error) {
    if (isTemporaryDbError(error)) {
      return fail(res, 503, 'Database temporarily unavailable. Please retry shortly.');
    }
    console.error('❌ Forward WhatsApp message error:', error);
    return fail(res, 500, error.message);
  }
});

// ─── POST /api/whatsapp/forward-image ────────────────────────────────────────
router.post('/forward-image', async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const { messageId, chatId, mediaUrl, caption } = req.body;
    if (!chatId || !mediaUrl) return fail(res, 400, 'chatId and mediaUrl required');

    console.log(`📤 Forwarding WhatsApp image to Teams: ${mediaUrl}`);
    const { sendImageToGroupChat } = await import('../services/teamsService.js');
    await sendImageToGroupChat(chatId, mediaUrl, caption || null, { tenantId });

    if (messageId) {
      await db('UPDATE whatsapp_messages SET forwarded_to_teams = true, batch_scanned = TRUE WHERE id = $1 AND tenant_id = $2', [messageId, tenantId]);
    }

    console.log(`✅ WhatsApp image forwarded to Teams: ${chatId}`);
    return ok(res, { forwarded: true });
  } catch (error) {
    if (isTemporaryDbError(error)) {
      return fail(res, 503, 'Database temporarily unavailable. Please retry shortly.');
    }
    console.error('❌ WhatsApp forward-image error:', error.message);
    return fail(res, 500, error.message);
  }
});

// ─── POST /api/whatsapp/send ──────────────────────────────────────────────────
router.post('/send', async (req, res) => {
  try {
    const tenantId = req.tenantId || DEFAULT_TENANT_ID;
    const { to, message, mediaUrl } = req.body;
    if (!to || !message) return fail(res, 400, 'to and message are required');
    const result = await sendWhatsApp(to, message, { mediaUrl });
    if (result.success) {
      await db(
        `INSERT INTO whatsapp_messages (tenant_id, sender, sender_phone, body, message_sid, timestamp, direction)
         VALUES ($1, $2, $3, $4, $5, $6, 'outbound')`,
        [tenantId, 'System', to, message, result.messageSid, result.sentAt]
      );
      return ok(res, result);
    } else {
      return fail(res, 500, result.error || 'WhatsApp send failed');
    }
  } catch (error) {
    if (isTemporaryDbError(error)) {
      return fail(res, 503, 'Database temporarily unavailable. Please retry shortly.');
    }
    return fail(res, 500, error.message);
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
    return ok(res, result.rows);
  } catch (error) {
    if (isTemporaryDbError(error)) {
      return ok(res, []);
    }
    return fail(res, 500, error.message);
  }
});

// ─── GET /api/whatsapp/test ───────────────────────────────────────────────────
router.get('/test', async (req, res) => {
  try {
    const result = await db('SELECT COUNT(*) as count FROM whatsapp_messages WHERE tenant_id = $1', [req.tenantId || DEFAULT_TENANT_ID]);
    return ok(res, { message: 'WhatsApp routes working', totalMessages: result.rows[0].count, groups: SELECTED_WHATSAPP_GROUPS });
  } catch (error) {
    if (isTemporaryDbError(error)) {
      return ok(res, { message: 'WhatsApp routes working (DB temporarily unavailable)', totalMessages: 0, groups: SELECTED_WHATSAPP_GROUPS });
    }
    return fail(res, 500, error.message);
  }
});

router.get('/simple-test', (req, res) => {
  return ok(res, { message: 'Simple test route works!', groups: SELECTED_WHATSAPP_GROUPS });
});

export default router;
