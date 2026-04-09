// backend/routes/summaryRoutes.js
// Handles saving and fetching summaries for Python service
import express from "express";
import { query } from "../db/index.js";
import { resolveSlackChannel } from "../utils/slackMapper.js";
//summayRoutes.js - Routes for saving and fetching channel summaries for Python service
const router = express.Router();

// ─── POST /api/summaries/save ─────────────────────────────────────────────────
router.post("/save", async (req, res) => {
  try {
    const { source, channel_id, channel_name, summary_text, message_count } = req.body;
    await query(`
      INSERT INTO channel_summaries 
        (channel_id, source, channel_name, summary_text, message_count, last_updated)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (channel_id, source)
      DO UPDATE SET
        summary_text  = EXCLUDED.summary_text,
        channel_name  = EXCLUDED.channel_name,
        message_count = EXCLUDED.message_count,
        last_updated  = NOW()
    `, [channel_id, source, resolveSlackChannel(channel_id, channel_name), summary_text, message_count]);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Save summary error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/summaries/get/:source/:channel_id ───────────────────────────────
router.get("/get/:source/:channel_id", async (req, res) => {
  try {
    const { source, channel_id } = req.params;
    const result = await query(`
      SELECT channel_id, source, channel_name, summary_text, message_count, last_updated
      FROM channel_summaries
      WHERE channel_id = $1 AND source = $2
    `, [channel_id, source]);
    res.json(result.rows[0] || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/summaries/list ──────────────────────────────────────────────────
router.get("/list", async (req, res) => {
  try {
    const result = await query(`
      SELECT channel_id, source, channel_name, summary_text, message_count, last_updated
      FROM channel_summaries
      ORDER BY last_updated DESC
    `);
    const rows = result.rows.map(m => ({
      ...m,
      channel_name: m.source === 'slack' ? resolveSlackChannel(m.channel_id, m.channel_name) : m.channel_name
    }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;