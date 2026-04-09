import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();
//forwardLogRoutes.js

// GET /api/forward-logs
router.get('/', async (req, res) => {
  try {
    const { status, source, limit = 100 } = req.query;

    let conditions = [];
    let params = [];
    let idx = 1;

    if (status && status !== 'all') {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (source && source !== 'all') {
      conditions.push(`source = $${idx++}`);
      params.push(source);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await query(
      `SELECT * FROM forward_logs ${where} ORDER BY forwarded_at DESC LIMIT $${idx}`,
      [...params, parseInt(limit)]
    );

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query(`DELETE FROM forward_logs WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


export default router;