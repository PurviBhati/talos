// routes/scanRoutes.js
// OpenClaw – Manual Trigger Routes for Testing
// Built by AppsRow Solutions LLP

import express from 'express';
import { runWhatsAppGroupScan } from '../services/whatsappGroupTracker.js';
import { runSlackBatchScan } from '../services/slackBatchScanner.js';
import { handleSlackThreadEvent } from '../services/slackThreadTracker.js';
import { query } from '../db/index.js';
import { WebClient } from '@slack/web-api';
import { resolveSlackChannel } from '../utils/slackMapper.js';

const router = express.Router();
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// ─── GET /api/scan/whatsapp ───────────────────────────────────────────────────
router.get('/whatsapp', async (req, res) => {
  try {
    console.log(`🔧 Manual WhatsApp scan triggered`);
    const results = await runWhatsAppGroupScan();
    res.json({ success: true, results });
  } catch (err) {
    console.error('❌ Manual WhatsApp scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/scan/whatsapp ──────────────────────────────────────────────────
router.post('/whatsapp', async (req, res) => {
  try {
    const { group } = req.body || {};
    console.log(`🔧 Manual WhatsApp scan triggered${group ? ` for "${group}"` : ' for all groups'}`);

    let results = await runWhatsAppGroupScan();

    if (group) {
      const { SELECTED_WHATSAPP_GROUPS } = await import('../config/whatsappGroups.js');
      if (!SELECTED_WHATSAPP_GROUPS.includes(group)) {
        return res.status(400).json({
          error: `Group "${group}" not in SELECTED_WHATSAPP_GROUPS`,
          available: SELECTED_WHATSAPP_GROUPS,
        });
      }
      results = results.filter(r => r.groupName === group);
    }

    res.json({ success: true, results });
  } catch (err) {
    console.error('❌ Manual WhatsApp scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/scan/whatsapp/peek ──────────────────────────────────────────────
// Shows what messages WOULD be scanned without actually scanning them
// Use query params: ?group=Avishkar Branding&minutes=60
router.get('/whatsapp/peek', async (req, res) => {
  try {
    const { group, minutes = 30 } = req.query;
    const { SELECTED_WHATSAPP_GROUPS } = await import('../config/whatsappGroups.js');
    const groups = group ? [group] : SELECTED_WHATSAPP_GROUPS;

    const preview = [];
    for (const groupName of groups) {
      const result = await query(
        `SELECT id, sender, body, timestamp, batch_scanned, media_urls
         FROM whatsapp_messages
         WHERE group_name = $1
           AND direction = 'inbound'
           AND (batch_scanned IS NULL OR batch_scanned = FALSE)
           AND (dismissed IS NULL OR dismissed = FALSE)
           AND timestamp >= NOW() - ($2 || ' minutes')::INTERVAL
         ORDER BY timestamp ASC`,
        [groupName, minutes]
      );
      preview.push({
        groupName,
        messageCount: result.rows.length,
        messages: result.rows.map(m => ({
          id: m.id,
          sender: m.sender,
          body: (m.body || '').slice(0, 100),
          timestamp: m.timestamp,
          hasMedia: (() => { try { return JSON.parse(m.media_urls || '[]').length > 0; } catch { return false; } })(),
        })),
      });
    }

    res.json({ success: true, windowMinutes: minutes, preview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/scan/slack ──────────────────────────────────────────────────────
// Triggers Slack batch scan across all mapped channels
router.get('/slack', async (req, res) => {
  try {
    console.log(`🔧 Manual Slack batch scan triggered`);
    const results = await runSlackBatchScan();
    res.json({ success: true, results });
  } catch (err) {
    console.error('❌ Manual Slack batch scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/scan/slack/peek ─────────────────────────────────────────────────
// Shows what Slack messages WOULD be scanned without actually scanning them
router.get('/slack/peek', async (req, res) => {
  try {
    const { minutes = 30 } = req.query;

    const channels = await query(
      `SELECT slack_channel_id, slack_channel_name
       FROM channel_mappings
       WHERE active = true
         AND slack_channel_id IS NOT NULL
         AND slack_channel_id != 'none'
         AND slack_channel_id != ''`
    );

    const preview = [];
    for (const ch of channels.rows) {
      const result = await query(
        `SELECT id, sender, body, timestamp, batch_scanned
         FROM slack_messages
         WHERE channel_id = $1
           AND (batch_scanned IS NULL OR batch_scanned = FALSE)
           AND (dismissed IS NULL OR dismissed = FALSE)
           AND (forwarded_to_teams IS NULL OR forwarded_to_teams = FALSE)
           AND timestamp >= NOW() - ($2 || ' minutes')::INTERVAL
         ORDER BY timestamp ASC`,
        [ch.slack_channel_id, minutes]
      );
      preview.push({
        channel: ch.slack_channel_name,
        messageCount: result.rows.length,
        messages: result.rows.map(m => ({
          id: m.id,
          sender: m.sender,
          body: (m.body || '').slice(0, 100),
          timestamp: m.timestamp,
        })),
      });
    }

    res.json({ success: true, windowMinutes: minutes, preview });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/scan/slack/thread ──────────────────────────────────────────────
// Manually re-triggers thread tracking for a specific Slack thread
// Body: { channelId: "C0AHE5C59NH", threadTs: "1234567890.123456" }
router.post('/slack/thread', async (req, res) => {
  try {
    const { channelId, threadTs, senderName = 'Manual Trigger' } = req.body || {};

    if (!channelId || !threadTs) {
      return res.status(400).json({ error: 'channelId and threadTs are required' });
    }

    let channelName = resolveSlackChannel(channelId, null);
    try {
      const info = await slack.conversations.info({ channel: channelId });
      channelName = resolveSlackChannel(channelId, info.channel?.name || null);
    } catch {}

    console.log(`🔧 Manual Slack thread scan: ${channelName} / thread ${threadTs}`);

    const fakeEvent = {
      type: 'message',
      ts: `${Date.now() / 1000}`,
      thread_ts: threadTs,
      channel: channelId,
      user: 'manual',
      text: '',
    };

    const result = await handleSlackThreadEvent(fakeEvent, { channelId, channelName, senderName });
    res.json({ success: true, result });
  } catch (err) {
    console.error('❌ Manual Slack thread scan error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/scan/status ─────────────────────────────────────────────────────
// Health check — shows pending message counts + last tasks sent
router.get('/status', async (req, res) => {
  try {
    const { SELECTED_WHATSAPP_GROUPS } = await import('../config/whatsappGroups.js');

    const whatsapp = await query(
      `SELECT group_name, COUNT(*) as pending
       FROM whatsapp_messages
       WHERE group_name = ANY($1)
         AND direction = 'inbound'
         AND (batch_scanned IS NULL OR batch_scanned = FALSE)
         AND (dismissed IS NULL OR dismissed = FALSE)
         AND timestamp >= NOW() - INTERVAL '30 minutes'
       GROUP BY group_name`,
      [SELECTED_WHATSAPP_GROUPS]
    );

    const slackThreads = await query(
      `SELECT channel_name, COUNT(*) as total_threads
       FROM slack_threads
       WHERE updated_at >= NOW() - INTERVAL '1 hour'
       GROUP BY channel_name`
    );

    const lastWhatsappTasks = await query(
      `SELECT group_name, task_title, forwarded, scanned_at
       FROM whatsapp_batch_tasks
       ORDER BY scanned_at DESC
       LIMIT 5`
    );

    const slackPending = await query(
      `SELECT cm.slack_channel_name, COUNT(*) as pending
       FROM slack_messages sm
       JOIN channel_mappings cm ON cm.slack_channel_id = sm.channel_id
       WHERE cm.active = true
         AND (sm.batch_scanned IS NULL OR sm.batch_scanned = FALSE)
         AND (sm.dismissed IS NULL OR sm.dismissed = FALSE)
         AND (sm.forwarded_to_teams IS NULL OR sm.forwarded_to_teams = FALSE)
         AND sm.timestamp >= NOW() - INTERVAL '30 minutes'
       GROUP BY cm.slack_channel_name`
    );

    res.json({
      whatsapp_pending: whatsapp.rows,
      slack_pending: slackPending.rows,
      slack_active_threads: slackThreads.rows,
      last_whatsapp_tasks: lastWhatsappTasks.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;