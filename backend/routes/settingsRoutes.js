import express from 'express';
import { query } from '../db/index.js';
import { clearRuntimeAIConfig, getRuntimeAIConfigSummary, setRuntimeAIConfig } from '../services/runtimeAiConfig.js';
import { readFile } from 'fs/promises';
import path from 'path';
import pkg from 'pg';

const router = express.Router();
const { Pool } = pkg;

const SUPABASE_SETTINGS_KEY = 'supabase_runtime';

async function ensureSystemSettingsTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS system_settings (
      id SERIAL PRIMARY KEY,
      setting_key TEXT UNIQUE NOT NULL,
      setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

// ─── AI Runtime Settings ──────────────────────────────────────────────────────

router.get('/settings/ai', async (_req, res) => {
  try {
    return res.json({ success: true, config: getRuntimeAIConfigSummary() });
  } catch (err) {
    console.error('[Settings] GET ai:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/settings/ai', async (req, res) => {
  try {
    const { apiKey, model, reset } = req.body || {};
    if (reset === true) {
      clearRuntimeAIConfig();
      return res.json({ success: true, config: getRuntimeAIConfigSummary() });
    }

    if (apiKey !== undefined && String(apiKey).trim() === '') {
      return res.status(400).json({ success: false, error: 'apiKey cannot be empty. Use reset=true to clear runtime override.' });
    }
    if (model !== undefined && String(model).trim() === '') {
      return res.status(400).json({ success: false, error: 'model cannot be empty. Use reset=true to clear runtime override.' });
    }

    setRuntimeAIConfig({ apiKey, model });
    return res.json({ success: true, config: getRuntimeAIConfigSummary() });
  } catch (err) {
    console.error('[Settings] PUT ai:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Supabase Runtime Settings ───────────────────────────────────────────────

router.get('/settings/supabase', async (_req, res) => {
  try {
    await ensureSystemSettingsTable();
    const row = await query(
      `SELECT setting_value, updated_at
       FROM system_settings
       WHERE setting_key = $1`,
      [SUPABASE_SETTINGS_KEY]
    );
    const saved = row.rows[0]?.setting_value || {};
    const hasSaved = !!row.rows[0];
    const merged = {
      url: hasSaved ? (saved.url || '') : (process.env.SUPABASE_URL || ''),
      bucket: hasSaved ? (saved.bucket || '') : (process.env.SUPABASE_BUCKET || ''),
      dbUrl: hasSaved ? (saved.dbUrl || '') : (process.env.SUPABASE_DB_URL || ''),
      serviceKey: hasSaved ? (saved.serviceKey || '') : (process.env.SUPABASE_SERVICE_KEY || ''),
      lastVerifiedAt: hasSaved ? (saved.lastVerifiedAt || null) : null,
      lastVerifiedDbHost: hasSaved ? (saved.lastVerifiedDbHost || '') : '',
    };
    return res.json({
      success: true,
      config: {
        source: hasSaved ? 'runtime' : 'env',
        url: merged.url,
        bucket: merged.bucket,
        dbHost: extractDbHost(merged.dbUrl),
        dbUrlMasked: maskDbUrl(merged.dbUrl),
        serviceKeyMasked: maskSecret(merged.serviceKey),
        hasServiceKey: !!String(merged.serviceKey || '').trim(),
        updatedAt: row.rows[0]?.updated_at || null,
        lastVerifiedAt: merged.lastVerifiedAt,
        lastVerifiedDbHost: merged.lastVerifiedDbHost,
      },
    });
  } catch (err) {
    console.error('[Settings] GET supabase:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.put('/settings/supabase', async (req, res) => {
  try {
    await ensureSystemSettingsTable();
    const { reset, url, serviceKey, bucket, dbUrl } = req.body || {};
    if (reset === true) {
      await query(`DELETE FROM system_settings WHERE setting_key = $1`, [SUPABASE_SETTINGS_KEY]);
      return res.json({ success: true, message: 'Supabase config reset to .env defaults. Restart server to apply fully.' });
    }

    const row = await query(
      `SELECT setting_value
       FROM system_settings
       WHERE setting_key = $1`,
      [SUPABASE_SETTINGS_KEY]
    );
    const current = row.rows[0]?.setting_value || {};
    const envDefaults = {
      url: sanitize(process.env.SUPABASE_URL),
      serviceKey: sanitize(process.env.SUPABASE_SERVICE_KEY),
      bucket: sanitize(process.env.SUPABASE_BUCKET),
      dbUrl: sanitize(process.env.SUPABASE_DB_URL),
    };
    const payload = {
      url: sanitize(url) || sanitize(current.url) || envDefaults.url,
      serviceKey: sanitize(serviceKey) || sanitize(current.serviceKey) || envDefaults.serviceKey,
      bucket: sanitize(bucket) || sanitize(current.bucket) || envDefaults.bucket,
      dbUrl: sanitize(dbUrl) || sanitize(current.dbUrl) || envDefaults.dbUrl,
    };
    if (!payload.url || !payload.serviceKey || !payload.dbUrl) {
      return res.status(400).json({
        success: false,
        error: 'url, serviceKey and dbUrl are required (bucket can fallback to .env/current). Or use reset=true.',
      });
    }

    await query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()`,
      [SUPABASE_SETTINGS_KEY, JSON.stringify(payload)]
    );

    // Apply to current process for components that read process.env on each use.
    process.env.SUPABASE_URL = payload.url;
    process.env.SUPABASE_SERVICE_KEY = payload.serviceKey;
    process.env.SUPABASE_BUCKET = payload.bucket;
    process.env.SUPABASE_DB_URL = payload.dbUrl;

    return res.json({
      success: true,
      message: 'Supabase config saved. Restart backend before using new database connection.',
      config: {
        source: 'runtime',
        url: payload.url,
        bucket: payload.bucket,
        dbHost: extractDbHost(payload.dbUrl),
        dbUrlMasked: maskDbUrl(payload.dbUrl),
        serviceKeyMasked: maskSecret(payload.serviceKey),
        hasServiceKey: true,
      },
    });
  } catch (err) {
    console.error('[Settings] PUT supabase:', err.message);
    return res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/settings/supabase/verify', async (req, res) => {
  let verifyPool = null;
  try {
    await ensureSystemSettingsTable();
    const { dbUrl } = req.body || {};
    const row = await query(
      `SELECT setting_value
       FROM system_settings
       WHERE setting_key = $1`,
      [SUPABASE_SETTINGS_KEY]
    );
    const current = row.rows[0]?.setting_value || {};
    const effectiveDbUrl = sanitize(dbUrl) || sanitize(current.dbUrl) || sanitize(process.env.SUPABASE_DB_URL);
    if (!effectiveDbUrl) {
      return res.status(400).json({ success: false, error: 'No dbUrl found. Provide dbUrl or save Supabase settings first.' });
    }

    const normalized = normalizeConnectionString(effectiveDbUrl);
    verifyPool = new Pool({
      connectionString: normalized,
      ssl: requiresSsl(normalized) ? { rejectUnauthorized: false } : false,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });
    await verifyConnectionWithRetry(verifyPool, 1);
    const verifiedHost = extractDbHost(effectiveDbUrl);
    await query(
      `INSERT INTO system_settings (setting_key, setting_value, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (setting_key)
       DO UPDATE SET
         setting_value = COALESCE(system_settings.setting_value, '{}'::jsonb) || $3::jsonb,
         updated_at = NOW()`,
      [
        SUPABASE_SETTINGS_KEY,
        JSON.stringify({ lastVerifiedAt: new Date().toISOString(), lastVerifiedDbHost: verifiedHost }),
        JSON.stringify({ lastVerifiedAt: new Date().toISOString(), lastVerifiedDbHost: verifiedHost }),
      ]
    );
    return res.json({
      success: true,
      message: 'Supabase connection verified.',
      dbHost: verifiedHost,
      dbUrlMasked: maskDbUrl(effectiveDbUrl),
      lastVerifiedAt: new Date().toISOString(),
    });
  } catch (err) {
    const normalized = normalizeVerifyError(err);
    return res.status(400).json({ success: false, error: normalized.message, code: normalized.code });
  } finally {
    if (verifyPool) {
      await verifyPool.end().catch(() => {});
    }
  }
});

router.get('/settings/schema', async (_req, res) => {
  try {
    const schemaPath = resolveSchemaPath();
    const schema = await readFile(schemaPath, 'utf8');
    return res.json({ success: true, schema, fileName: 'schema.sql' });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to read schema file' });
  }
});

router.get('/settings/schema/download', async (_req, res) => {
  try {
    const schemaPath = resolveSchemaPath();
    const schema = await readFile(schemaPath, 'utf8');
    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="schema.sql"');
    return res.send(schema);
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || 'Failed to download schema file' });
  }
});

// ─── GET /api/settings/mappings ───────────────────────────────────────────────

router.get('/settings/mappings', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, tenant_id, teams_chat_id, teams_chat_name, slack_channel_id, slack_channel_name,
              project_name, whatsapp_number, whatsapp_numbers, whatsapp_group_name, active, created_at
       FROM channel_mappings
       ORDER BY created_at DESC`
    );

    const mappings = result.rows.map(r => ({
      ...r,
      teams_thread_id:  r.teams_chat_id,
      slack_channels:   r.slack_channel_id ? [r.slack_channel_id] : [],
      whatsapp_numbers: Array.isArray(r.whatsapp_numbers) && r.whatsapp_numbers.length > 0
                          ? r.whatsapp_numbers
                          : r.whatsapp_number ? [r.whatsapp_number] : [],
    }));

    res.json({ success: true, mappings });
  } catch (err) {
    console.error('[Settings] GET mappings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/settings/mappings ─────────────────────────────────────────────

router.post('/settings/mappings', async (req, res) => {
  const {
    teams_thread_id, teams_chat_name = '', slack_channel_id = '',
    slack_channel_name = '', project_name = '',
    whatsapp_numbers, whatsapp_number = '', whatsapp_group_name = '',
    tenant_id, active = true,
  } = req.body;

  if (!teams_thread_id?.trim()) {
    return res.status(400).json({ success: false, error: 'teams_chat_id is required' });
  }

  const waNumbers = normalizeArray(whatsapp_numbers);
  const tid = (tenant_id || process.env.DEFAULT_TENANT_ID || 'tenant-default').trim();

  try {
    const result = await query(
      `INSERT INTO channel_mappings
         (tenant_id, teams_chat_id, teams_chat_name, slack_channel_id, slack_channel_name,
          project_name, whatsapp_number, whatsapp_numbers, whatsapp_group_name, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
      [
        tid,
        teams_thread_id.trim(),
        teams_chat_name.trim()    || teams_thread_id.trim(),
        slack_channel_id.trim(),
        slack_channel_name.trim() || slack_channel_id.trim(),
        project_name.trim()       || 'OpenClaw',
        whatsapp_number.trim()    || (waNumbers[0] || ''),
        waNumbers,
        whatsapp_group_name.trim() || null,
        active,
      ]
    );
    const r = result.rows[0];
    res.json({ success: true, mapping: normalize(r) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'This Teams chat ID already exists' });
    console.error('[Settings] POST mappings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/settings/mappings/:id ──────────────────────────────────────────

router.put('/settings/mappings/:id', async (req, res) => {
  const { id } = req.params;
  const {
    teams_thread_id, teams_chat_name, slack_channel_id, slack_channel_name,
    project_name, whatsapp_numbers, whatsapp_number, whatsapp_group_name, tenant_id, active,
  } = req.body;

  const waNumbers = normalizeArray(whatsapp_numbers);

  try {
    const result = await query(
      `UPDATE channel_mappings SET
         tenant_id            = COALESCE($1, tenant_id),
         teams_chat_id      = COALESCE($2, teams_chat_id),
         teams_chat_name    = COALESCE($3, teams_chat_name),
         slack_channel_id   = COALESCE($4, slack_channel_id),
         slack_channel_name = COALESCE($5, slack_channel_name),
         project_name       = COALESCE($6, project_name),
         whatsapp_number    = COALESCE($7, whatsapp_number),
         whatsapp_numbers   = $8,
         whatsapp_group_name = COALESCE($9, whatsapp_group_name),
         active             = COALESCE($10, active)
       WHERE id = $11 RETURNING *`,
      [
        tenant_id?.trim() || null,
        teams_thread_id?.trim()    || null,
        teams_chat_name?.trim()    || null,
        slack_channel_id?.trim()   || null,
        slack_channel_name?.trim() || null,
        project_name?.trim()       || null,
        whatsapp_number?.trim()    || (waNumbers[0] || null),
        waNumbers,
        whatsapp_group_name !== undefined ? (whatsapp_group_name?.trim() || null) : null,
        active ?? null,
        id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Mapping not found' });
    res.json({ success: true, mapping: normalize(result.rows[0]) });
  } catch (err) {
    console.error('[Settings] PUT mappings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/settings/mappings/:id ───────────────────────────────────────

router.delete('/settings/mappings/:id', async (req, res) => {
  try {
    await query(`DELETE FROM channel_mappings WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Settings] DELETE mappings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/settings/mappings/:id/toggle ─────────────────────────────────

router.patch('/settings/mappings/:id/toggle', async (req, res) => {
  try {
    const result = await query(
      `UPDATE channel_mappings SET active = NOT active WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json({ success: true, mapping: normalize(result.rows[0]) });
  } catch (err) {
    console.error('[Settings] PATCH toggle:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(r) {
  return {
    ...r,
    teams_thread_id:  r.teams_chat_id,
    slack_channels:   r.slack_channel_id ? [r.slack_channel_id] : [],
    whatsapp_numbers: Array.isArray(r.whatsapp_numbers) && r.whatsapp_numbers.length > 0
                        ? r.whatsapp_numbers
                        : r.whatsapp_number ? [r.whatsapp_number] : [],
  };
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
  return [];
}

function sanitize(value) {
  return String(value || '').trim();
}

function maskSecret(secret) {
  const value = sanitize(secret);
  if (!value) return '';
  if (value.length <= 8) return '********';
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function extractDbHost(dbUrl) {
  const raw = sanitize(dbUrl);
  if (!raw) return '';
  try {
    return new URL(raw).host;
  } catch {
    return '';
  }
}

function maskDbUrl(dbUrl) {
  const raw = sanitize(dbUrl);
  if (!raw) return '';
  try {
    const u = new URL(raw);
    const user = u.username || 'postgres';
    const host = u.host || '';
    const db = u.pathname?.replace(/^\//, '') || 'postgres';
    return `${u.protocol}//${user}:****@${host}/${db}`;
  } catch {
    return '';
  }
}

function requiresSsl(connectionString = '') {
  return connectionString.includes('supabase.com') || connectionString.includes('pooler.supabase.com');
}

function normalizeConnectionString(connectionString = '') {
  if (!connectionString) return connectionString;
  if (!requiresSsl(connectionString)) return connectionString;
  return connectionString
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/([?&])ssl=[^&]*/gi, '$1')
    .replace(/[?&]$/, '');
}

function resolveSchemaPath() {
  const direct = path.resolve(process.cwd(), 'database', 'schema.sql');
  const parent = path.resolve(process.cwd(), '..', 'database', 'schema.sql');
  return direct.includes('\\backend\\') || direct.includes('/backend/')
    ? parent
    : direct;
}

async function verifyConnectionWithRetry(pool, retries = 1) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await pool.query('SELECT 1');
    } catch (err) {
      lastErr = err;
      if (attempt >= retries || !isTransientVerifyError(err)) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 400 + Math.floor(Math.random() * 300)));
    }
  }
  throw lastErr;
}

function isTransientVerifyError(err) {
  const code = String(err?.code || '').toUpperCase();
  const msg = String(err?.message || '').toLowerCase();
  return code === 'ENOTFOUND' || code === 'ETIMEDOUT' || code === 'ECONNRESET' ||
    msg.includes('timeout') || msg.includes('connection terminated unexpectedly');
}

function normalizeVerifyError(err) {
  const code = String(err?.code || '').toUpperCase();
  const msg = String(err?.message || '');
  if (code === 'ENOTFOUND') return { code, message: 'Host not reachable. Check pooler host in SUPABASE_DB_URL.' };
  if (code === 'ETIMEDOUT') return { code, message: 'Connection timed out. Check network/firewall and try again.' };
  if (code === 'ECONNRESET') return { code, message: 'Connection reset by server. Retry in a few seconds.' };
  if (code === '28P01') return { code, message: 'Invalid database credentials in SUPABASE_DB_URL.' };
  if (code === '3D000') return { code, message: 'Database does not exist in the provided connection string.' };
  if (code === '28000') return { code, message: 'Authentication failed for database user.' };
  if (/self-signed certificate|certificate/i.test(msg)) return { code: code || 'SSL', message: 'TLS/SSL handshake issue. Use pooler URI and keep sslmode unset or require.' };
  return { code: code || 'VERIFY_FAILED', message: msg || 'Verification failed due to an internal error.' };
}

export default router;