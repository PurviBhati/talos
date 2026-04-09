const express = require('express');
const router = express.Router();
const db = require('../db');
//messages.js defines API routes for managing messages and AI-generated drafts. It includes endpoints to fetch recent messages, pending drafts, approved drafts, and message statistics. It also provides functionality to dismiss messages and approve or ignore drafts. The routes interact with the PostgreSQL database to perform necessary operations and return JSON responses to the client.
// ─── Helper: 2-day window ─────────────────────────────────────────────────────

function getTwoDaysAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 2);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ─── GET /api/messages — all messages from last 2 days ───────────────────────

router.get('/messages', async (req, res) => {
  try {
    const since = getTwoDaysAgo();

    const result = await db.query(
      `SELECT
         id,
         source,
         sender,
         content,
         file_url,
         file_name,
         file_type,
         thread_id,
         dismissed,
         created_at
       FROM messages
       WHERE created_at >= $1
         AND dismissed = false
       ORDER BY created_at DESC`,
      [since]
    );

    res.json({ success: true, messages: result.rows });
  } catch (err) {
    console.error('[Messages] GET /messages error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/messages/drafts — AI drafts pending action (last 2 days) ────────

router.get('/messages/drafts', async (req, res) => {
  try {
    const since = getTwoDaysAgo();

    const result = await db.query(
      `SELECT
         d.id,
         d.message_id,
         d.draft_text,
         d.category,
         d.priority,
         d.reason,
         d.status,
         m.sender,
         m.source,
         m.content AS original_message,
         m.file_url,
         m.file_name,
         m.file_type,
         m.created_at
       FROM drafts d
       JOIN messages m ON m.id = d.message_id
       WHERE d.status = 'pending'
         AND m.created_at >= $1
         AND m.dismissed = false
       ORDER BY
         CASE d.priority
           WHEN 'critical' THEN 1
           WHEN 'high'     THEN 2
           WHEN 'medium'   THEN 3
           WHEN 'low'      THEN 4
           ELSE 5
         END,
         m.created_at DESC`,
      [since]
    );

    res.json({ success: true, drafts: result.rows });
  } catch (err) {
    console.error('[Messages] GET /messages/drafts error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/messages/approved — approved drafts (last 2 days) ───────────────

router.get('/messages/approved', async (req, res) => {
  try {
    const since = getTwoDaysAgo();

    const result = await db.query(
      `SELECT
         d.id,
         d.message_id,
         d.draft_text,
         d.category,
         d.priority,
         d.approved_at,
         m.sender,
         m.source,
         m.content AS original_message,
         m.file_url,
         m.file_name,
         m.created_at
       FROM drafts d
       JOIN messages m ON m.id = d.message_id
       WHERE d.status = 'approved'
         AND m.created_at >= $1
       ORDER BY d.approved_at DESC`,
      [since]
    );

    res.json({ success: true, approved: result.rows });
  } catch (err) {
    console.error('[Messages] GET /messages/approved error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/messages/dismiss — dismiss a message ──────────────────────────

router.post('/messages/dismiss', async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ success: false, error: 'id required' });

  try {
    await db.query(`UPDATE messages SET dismissed = true WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Messages] dismiss error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/messages/approve-draft ────────────────────────────────────────

router.post('/messages/approve-draft', async (req, res) => {
  const { draftId, editedText } = req.body;
  if (!draftId) return res.status(400).json({ success: false, error: 'draftId required' });

  try {
    await db.query(
      `UPDATE drafts
       SET status = 'approved', draft_text = COALESCE($2, draft_text), approved_at = NOW()
       WHERE id = $1`,
      [draftId, editedText || null]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Messages] approve-draft error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/messages/ignore-draft ─────────────────────────────────────────

router.post('/messages/ignore-draft', async (req, res) => {
  const { draftId } = req.body;
  if (!draftId) return res.status(400).json({ success: false, error: 'draftId required' });

  try {
    await db.query(
      `UPDATE drafts SET status = 'ignored' WHERE id = $1`,
      [draftId]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[Messages] ignore-draft error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/messages/stats — dashboard counters ─────────────────────────────

router.get('/messages/stats', async (req, res) => {
  try {
    const since = getTwoDaysAgo();

    const [total, pending, approved, ignored] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM messages WHERE created_at >= $1 AND dismissed = false`, [since]),
      db.query(`SELECT COUNT(*) FROM drafts d JOIN messages m ON m.id = d.message_id WHERE d.status = 'pending' AND m.created_at >= $1`, [since]),
      db.query(`SELECT COUNT(*) FROM drafts d JOIN messages m ON m.id = d.message_id WHERE d.status = 'approved' AND m.created_at >= $1`, [since]),
      db.query(`SELECT COUNT(*) FROM drafts d JOIN messages m ON m.id = d.message_id WHERE d.status = 'ignored' AND m.created_at >= $1`, [since]),
    ]);

    res.json({
      success: true,
      stats: {
        total:    parseInt(total.rows[0].count),
        pending:  parseInt(pending.rows[0].count),
        approved: parseInt(approved.rows[0].count),
        ignored:  parseInt(ignored.rows[0].count),
        since,
      },
    });
  } catch (err) {
    console.error('[Messages] stats error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;