import express from "express";
import { query } from "../db/index.js";
import { requireTenant } from "../middleware/tenantContext.js";
import { fail, ok } from "../utils/apiResponse.js";

const router = express.Router();
router.use(requireTenant);

router.get("/", async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const limitRaw = Number.parseInt(String(req.query.limit || "100"), 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 300) : 100;
    const source = String(req.query.source || "").trim().toLowerCase();

    const params = [tenantId];
    let where = "WHERE tenant_id = $1";
    if (source) {
      params.push(source);
      where += ` AND source = $${params.length}`;
    }

    params.push(limit);
    const sql = `
      SELECT
        id,
        tenant_id,
        source,
        source_message_id,
        platform_label,
        sender,
        sender_handle,
        comment_body,
        url,
        read_content,
        created_at
      FROM link_reads
      ${where}
      ORDER BY created_at DESC
      LIMIT $${params.length}
    `;

    const result = await query(sql, params);
    return ok(res, result.rows || []);
  } catch (err) {
    return fail(res, 500, err.message);
  }
});

export default router;
