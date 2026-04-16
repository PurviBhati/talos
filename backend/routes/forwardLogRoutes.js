import express from 'express';
import { query } from '../db/index.js';
import { requireTenant } from '../middleware/tenantContext.js';
import { fail, ok } from '../utils/apiResponse.js';

const router = express.Router();
//forwardLogRoutes.js
router.use(requireTenant);

// GET /api/forward-logs
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status, source, limit = 100 } = req.query;

    const conditions = ['tenant_id = $1'];
    const params = [tenantId];
    let idx = 2;

    if (status && status !== 'all') {
      conditions.push(`status = $${idx++}`);
      params.push(status);
    }
    if (source && source !== 'all') {
      conditions.push(`source = $${idx++}`);
      params.push(source);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const result = await query(
      `SELECT * FROM forward_logs ${where} ORDER BY forwarded_at DESC LIMIT $${idx}`,
      [...params, parseInt(limit)]
    );

    return ok(res, result.rows);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await query(`DELETE FROM forward_logs WHERE id = $1 AND tenant_id = $2`, [req.params.id, req.tenantId]);
    return ok(res, { deleted: true });
  } catch (err) {
    return fail(res, 500, err.message);
  }
});


export default router;