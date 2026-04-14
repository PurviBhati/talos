import pkg from 'pg';
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

const { Pool } = pkg;
const databaseUrl = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

function requiresSsl(connectionString = '') {
  return connectionString.includes('supabase.com') || connectionString.includes('pooler.supabase.com');
}

function isLocalConnection(connectionString = '') {
  return connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
}

function normalizeConnectionString(connectionString = '') {
  if (!connectionString) return connectionString;
  if (!requiresSsl(connectionString)) return connectionString;
  return connectionString
    .replace(/([?&])sslmode=[^&]*/gi, '$1')
    .replace(/([?&])ssl=[^&]*/gi, '$1')
    .replace(/[?&]$/, '');
}

function formatDbError(err) {
  if (!err) return 'Unknown database error';
  if (err.message) return err.message;
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    return err.errors.map((entry) => entry.message).filter(Boolean).join(' | ');
  }
  return String(err);
}

/** Postgres + Node I/O errors that usually succeed on retry (new connection from pool). */
function isTransientDbError(err) {
  if (!err) return false;
  const msg = String(err.message || err || '').toLowerCase();
  const nodeCode = String(err.code || '').toUpperCase();

  if (
    nodeCode === 'ECONNRESET' ||
    nodeCode === 'ENOTFOUND' ||
    nodeCode === 'ETIMEDOUT' ||
    nodeCode === 'ECONNABORTED' ||
    nodeCode === 'EPIPE' ||
    nodeCode === 'ESOCKETTIMEDOUT' ||
    nodeCode === 'ECONNREFUSED'
  ) {
    return true;
  }

  const pg = String(err.code || '');
  if (
    pg === '57P01' ||
    pg === '08006' ||
    pg === '08003' ||
    pg === '08001' ||
    pg === '08004'
  ) {
    return true;
  }

  if (pg === 'XX000') {
    return (
      msg.includes('dbhandler') ||
      msg.includes('connection') ||
      msg.includes('exited') ||
      msg.includes('pool') ||
      msg.includes('ssl') ||
      msg.includes('server') ||
      msg.includes('broken')
    );
  }

  if (
    msg.includes('connection terminated unexpectedly') ||
    msg.includes('server closed the connection unexpectedly') ||
    msg.includes('connection terminated') ||
    msg.includes('dbhandler') ||
    msg.includes('write econnaborted') ||
    msg.includes('broken pipe') ||
    msg.includes('socket hang up')
  ) {
    return true;
  }

  return false;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function envInt(name, fallback) {
  const raw = Number.parseInt(String(process.env[name] || ''), 10);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

if (!databaseUrl) {
  throw new Error('Database is not configured. Set SUPABASE_DB_URL (preferred) or DATABASE_URL.');
}

const allowLocalDb = String(process.env.ALLOW_LOCAL_DB || '').toLowerCase() === 'true';
if (!allowLocalDb && isLocalConnection(databaseUrl)) {
  throw new Error('Local database connection is disabled. Set SUPABASE_DB_URL and keep ALLOW_LOCAL_DB=false.');
}

const normalizedDatabaseUrl = normalizeConnectionString(databaseUrl);
const poolMax = envInt('PG_POOL_MAX', 15);
const idleTimeoutMs = envInt('PG_IDLE_TIMEOUT_MS', 20000);
const connectionTimeoutMs = envInt('PG_CONNECTION_TIMEOUT_MS', 20000);
const maxUses = envInt('PG_MAX_USES', 2000);

const pool = new Pool({
  connectionString: normalizedDatabaseUrl,
  ssl: requiresSsl(normalizedDatabaseUrl) ? { rejectUnauthorized: false } : false,
  max: poolMax,
  idleTimeoutMillis: idleTimeoutMs,
  connectionTimeoutMillis: connectionTimeoutMs,
  keepAlive: true,
  keepAliveInitialDelayMillis: envInt('PG_KEEPALIVE_DELAY_MS', 10000),
  maxUses,
});

let lastPoolErrorSignature = '';
let lastPoolErrorAt = 0;
const POOL_ERROR_LOG_COOLDOWN_MS = envInt('PG_POOL_ERROR_LOG_COOLDOWN_MS', 60000);

pool.on('error', (err) => {
  const sig = `${String(err?.code || '')}:${formatDbError(err).slice(0, 120)}`;
  const now = Date.now();
  if (sig !== lastPoolErrorSignature || now - lastPoolErrorAt >= POOL_ERROR_LOG_COOLDOWN_MS) {
    lastPoolErrorSignature = sig;
    lastPoolErrorAt = now;
    console.error('PostgreSQL pool idle client error (non-fatal; next query will use a fresh connection):', formatDbError(err));
  }
});

pool.query('SELECT 1')
  .then(() => console.log('PostgreSQL connected'))
  .catch((err) => console.error('PostgreSQL connection error:', formatDbError(err)));

export async function query(text, params, options = {}) {
  const retries = Number.isInteger(options.retries) ? options.retries : envInt('PG_QUERY_RETRIES', 6);
  const retryDelayMs = Number.isInteger(options.retryDelayMs) ? options.retryDelayMs : envInt('PG_RETRY_BASE_DELAY_MS', 400);
  const retryMaxDelayMs = envInt('PG_RETRY_MAX_DELAY_MS', 8000);
  let lastErr;

  let firstTransientLogged = false;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      lastErr = err;
      const canRetry = attempt < retries && isTransientDbError(err);
      if (!canRetry) {
        if (isTransientDbError(err) && attempt >= retries) {
          console.error(`PostgreSQL query failed after ${retries + 1} attempts:`, formatDbError(err));
        }
        throw err;
      }
      const expo = retryDelayMs * 2 ** attempt;
      const jitter = Math.floor(Math.random() * 300);
      const delay = Math.min(expo + jitter, retryMaxDelayMs);
      const verbose = envInt('PG_VERBOSE_RETRY_LOG', 0) === 1;
      if (!firstTransientLogged) {
        console.warn(`PostgreSQL transient error (will retry up to ${retries} more times): ${formatDbError(err)}`);
        firstTransientLogged = true;
      } else if (verbose) {
        console.warn(`PostgreSQL query retry ${attempt + 1}/${retries}: ${formatDbError(err)}`);
      }
      await sleep(delay);
    }
  }

  throw lastErr;
}

export default pool;
