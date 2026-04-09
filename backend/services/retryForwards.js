// services/retryForwards.js
// OpenClaw – Retry Failed Teams Forwards
// Built by AppsRow Solutions LLP
//
// Runs every 5 minutes.
// Picks up failed forward_logs and retries sending to Teams.
// After 3 failed retries → marks as 'dead' (gives up).


import { query } from '../db/index.js';

const RETRY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;

// ─────────────────────────────────────────────────────────────────────────────
// DB HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function fetchFailedForwards(tenantId) {
  const result = await query(
    `SELECT *
     FROM forward_logs
     WHERE tenant_id = $1
       AND status = 'failed'
       AND retry_count < $2
       AND (last_retried_at IS NULL OR last_retried_at < NOW() - INTERVAL '5 minutes')
     ORDER BY created_at ASC
     LIMIT 20`,
    [tenantId, MAX_RETRIES]
  );
  return result.rows;
}

async function markDelivered(id) {
  await query(
    `UPDATE forward_logs 
     SET status = 'delivered', last_retried_at = NOW()
     WHERE id = $1`,
    [id]
  );
}

async function markRetried(id, retryCount, errorReason) {
  const newCount = retryCount + 1;
  const newStatus = newCount >= MAX_RETRIES ? 'dead' : 'failed';

  await query(
    `UPDATE forward_logs 
     SET retry_count = $1, status = $2, failure_reason = $3, last_retried_at = NOW()
     WHERE id = $4`,
    [newCount, newStatus, errorReason, id]
  );

  if (newStatus === 'dead') {
    console.warn(`💀 Forward permanently failed after ${MAX_RETRIES} retries (id: ${id})`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// RETRY — Attempt to resend a failed forward
// ─────────────────────────────────────────────────────────────────────────────

async function retryForward(log) {
  console.log(`🔄 Retrying forward (id: ${log.id}) attempt ${log.retry_count + 1}/${MAX_RETRIES} → ${log.teams_chat_name}`);

  if (!log.teams_chat_id || !log.card_content) {
    console.warn(`⚠️  Missing teams_chat_id or card_content for log id: ${log.id} — marking dead`);
    await markRetried(log.id, MAX_RETRIES, 'Missing teams_chat_id or card_content');
    return;
  }

  try {
    const { sendToGroupChat } = await import('./teamsService.js');
    await sendToGroupChat(log.teams_chat_id, log.card_content);
    await markDelivered(log.id);
    console.log(`✅ Retry successful (id: ${log.id}) → ${log.teams_chat_name}`);
  } catch (err) {
    console.error(`❌ Retry failed (id: ${log.id}): ${err.message}`);
    await markRetried(log.id, log.retry_count, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — Run retry job
// ─────────────────────────────────────────────────────────────────────────────

export async function runRetryJob() {
  const tenants = await query(`SELECT id FROM tenants`);
  for (const tenant of tenants.rows) {
    const failed = await fetchFailedForwards(tenant.id);
    if (!failed.length) continue;
    console.log(`🔄 Retry job [${tenant.id}]: ${failed.length} failed forward(s) to retry`);
    for (const log of failed) {
      await retryForward(log);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULER
// ─────────────────────────────────────────────────────────────────────────────

let retryInterval = null;

export function startRetryService() {
  console.log(`🔄 Retry service started — checking every ${RETRY_INTERVAL_MS / 60000} mins`);
  retryInterval = setInterval(() => runRetryJob().catch(console.error), RETRY_INTERVAL_MS);
}

export function stopRetryService() {
  if (retryInterval) {
    console.log('🛑 Stopping retry service...');
    clearInterval(retryInterval);
    retryInterval = null;
  }
}
