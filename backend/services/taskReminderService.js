import { query } from "../db/index.js";
import { sendToGroupChat } from "./teamsService.js";

const CHECK_INTERVAL_MS = 60 * 1000; // every minute
const REMINDER_HOUR_LOCAL = Number(process.env.TASK_REMINDER_HOUR || 9);
const REMINDER_MINUTE_LOCAL = Number(process.env.TASK_REMINDER_MINUTE || 30);
let reminderInterval = null;
const sentKeyByTenant = new Map();

async function sendPendingTaskReminders() {
  const tenants = await query(`SELECT id FROM tenants`);
  const todayKey = new Date().toISOString().slice(0, 10);

  for (const tenant of tenants.rows) {
    const tenantId = tenant.id;
    const dedupeKey = `${tenantId}:${todayKey}`;
    if (sentKeyByTenant.get(tenantId) === dedupeKey) continue;

    const pending = await query(
      `SELECT id, teams_conversation_id, COALESCE(platform_label, source) AS label, created_at
       FROM tasks
       WHERE tenant_id = $1
         AND status = 'pending'
         AND teams_conversation_id IS NOT NULL
         AND created_at < CURRENT_DATE
       ORDER BY created_at ASC`,
      [tenantId]
    );
    if (!pending.rows.length) {
      sentKeyByTenant.set(tenantId, dedupeKey);
      continue;
    }

    const grouped = new Map();
    for (const t of pending.rows) {
      const key = t.teams_conversation_id;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(t);
    }

    for (const [conversationId, rows] of grouped.entries()) {
      const lines = rows.slice(0, 10).map((r) => `- #${r.id} (${r.label})`);
      const more = rows.length > 10 ? `\n...and ${rows.length - 10} more pending tasks.` : "";
      const msg = `Reminder: Pending tasks from previous days.\n${lines.join("\n")}${more}`;
      try {
        await sendToGroupChat(conversationId, msg);
      } catch (err) {
        console.error(`❌ Reminder failed for conversation ${conversationId}: ${err.message}`);
      }
    }
    sentKeyByTenant.set(tenantId, dedupeKey);
  }
}

export function startTaskReminderService() {
  console.log(
    `⏰ Task reminder service started (daily at ${String(REMINDER_HOUR_LOCAL).padStart(2, "0")}:${String(REMINDER_MINUTE_LOCAL).padStart(2, "0")})`
  );
  reminderInterval = setInterval(async () => {
    try {
      const now = new Date();
      if (now.getHours() !== REMINDER_HOUR_LOCAL || now.getMinutes() !== REMINDER_MINUTE_LOCAL) return;
      await sendPendingTaskReminders();
    } catch (err) {
      console.error(`❌ Task reminder service error: ${err.message}`);
    }
  }, CHECK_INTERVAL_MS);
}

export function stopTaskReminderService() {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
}
