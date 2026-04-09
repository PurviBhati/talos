import { query } from "../db/index.js";

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "default";
const ALLOW_HEADER = String(process.env.ALLOW_HEADER_TENANT || "").toLowerCase() === "true";

export async function resolveDefaultTenantId() {
  const result = await query(
    `SELECT id FROM tenants WHERE slug = $1 LIMIT 1`,
    [DEFAULT_TENANT_SLUG]
  );
  return result.rows[0]?.id || null;
}

export async function tenantContext(req, _res, next) {
  try {
    const fromToken = req.user?.tenant_id || null;
    const fromHeader = ALLOW_HEADER ? (req.headers["x-tenant-id"] || null) : null;
    req.tenantId = fromToken || fromHeader || (await resolveDefaultTenantId());
    next();
  } catch (err) {
    next(err);
  }
}

export function requireTenant(req, res, next) {
  if (!req.tenantId) {
    return res.status(400).json({ error: "Missing tenant context" });
  }
  next();
}
