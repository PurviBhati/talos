import { query } from "../db/index.js";

const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "default";
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "tenant-default";
const ALLOW_HEADER = String(process.env.ALLOW_HEADER_TENANT || "").toLowerCase() === "true";
let cachedDefaultTenantId = null;
let cacheResolved = false;

export async function resolveDefaultTenantId() {
  if (cacheResolved) {
    return cachedDefaultTenantId;
  }
  const result = await query(
    `SELECT id FROM tenants WHERE slug = $1 LIMIT 1`,
    [DEFAULT_TENANT_SLUG]
  );
  cachedDefaultTenantId = result.rows[0]?.id || null;
  cacheResolved = true;
  return cachedDefaultTenantId;
}

export async function tenantContext(req, _res, next) {
  try {
    // Keep webhook validation route fast and dependency-free.
    // Microsoft Graph and local preflight must get a plain 200 quickly.
    if (req.path?.startsWith("/api/webhook")) {
      req.tenantId = req.user?.tenant_id || (ALLOW_HEADER ? (req.headers["x-tenant-id"] || null) : null) || DEFAULT_TENANT_ID;
      next();
      return;
    }

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
