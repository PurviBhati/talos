// services/clientHistory.js
// OpenClaw – Client Conversation History
// Built by AppsRow Solutions LLP
//
// Maintains a rolling 25-day compressed task history per group/channel.
// Used by whatsappGroupTracker.js and slackBatchScanner.js to give GPT
// full context of what the client has requested in the past.

import { query } from '../db/index.js';
import { getOpenAIClient, getOpenAIModel } from './runtimeAiConfig.js';


const HISTORY_DAYS = 25;

// ─────────────────────────────────────────────────────────────────────────────
// GET history for a group/channel
// ─────────────────────────────────────────────────────────────────────────────

export async function getClientHistory(tenantId, source, groupId) {
  try {
    const result = await query(
      `SELECT task_summary, last_updated
       FROM client_history
       WHERE tenant_id = $1 AND source = $2 AND group_id = $3`,
      [tenantId, source, groupId]
    );
    return result.rows[0] || null;
  } catch (err) {
    console.error(`❌ getClientHistory error:`, err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE history after a scan — compress new tasks into rolling summary
// ─────────────────────────────────────────────────────────────────────────────

export async function updateClientHistory(tenantId, source, groupId, groupName, newTasks) {
  if (!newTasks || !newTasks.length) return;

  try {
    // Fetch existing history
    const existing = await getClientHistory(tenantId, source, groupId);
    const existingSummary = existing?.task_summary || null;

    // Build new tasks block
    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const newTasksBlock = newTasks
      .map(t => `- [${today}] ${t.title}: ${t.description}`)
      .join('\n');

    let updatedSummary;

    if (existingSummary) {
      // Ask GPT to merge existing history with new tasks
      const prompt = `You are the Lead Project Controller for "${groupName}". 
        Your goal is to maintain a high-integrity audit log of all project movements for a ${HISTORY_DAYS}-day rolling window.

        Existing history (last ${HISTORY_DAYS} days):
        ${existingSummary}

        New tasks added today (${today}):
        ${newTasksBlock}

        ### INSTRUCTIONS:
        1. ROLLOVER: Retain all valid entries from the last ${HISTORY_DAYS} days. Purge entries older than that.
        2. DEDUPLICATION: If a new task is a duplicate or a minor update of an existing log entry, REPLACE the old entry with the new status.

        ### LOGGING INSTRUCTIONS:
        1. FORMAT: Use a strict, compact single-line format: 
        [DD MMM] [CATEGORY] Title: Concise status or core action.
        COMPRESSION: Remove wordy phrases like "Please review the context to determine" or "Ensure that all the images." Focus ONLY on the "What."

        Update the history by:
        1. Adding the new tasks with today's date
        2. Keeping all tasks from the last ${HISTORY_DAYS} days
        3. Removing any tasks older than ${HISTORY_DAYS} days
        4. Keeping each task as a single concise line: [date] task title: brief description
        5. Do not summarize or merge tasks — keep each one separate

        Return ONLY the updated history log, no explanation, no markdown.`;

      const response = await getOpenAIClient().chat.completions.create({
        model: getOpenAIModel(),
        temperature: 0,
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }],
      });

      updatedSummary = response.choices[0].message.content.trim();
    } else {
      // First time — just store new tasks
      updatedSummary = newTasksBlock;
    }

    // Upsert into DB
    const upd = await query(
      `UPDATE client_history
       SET task_summary = $4, group_name = $3, last_updated = NOW()
       WHERE tenant_id = $1 AND source = $2 AND group_id = $5`,
      [tenantId, source, groupName, updatedSummary, groupId]
    );
    if ((upd.rowCount || 0) === 0) {
      await query(
        `INSERT INTO client_history (tenant_id, source, group_id, group_name, task_summary, last_updated)
         VALUES ($1, $2, $3, $4, $5, NOW())`,
        [tenantId, source, groupId, groupName, updatedSummary]
      );
    }

    console.log(`📚 Client history updated: [${source}] ${groupName}`);
  } catch (err) {
    console.error(`❌ updateClientHistory error:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT history for GPT context
// ─────────────────────────────────────────────────────────────────────────────

export function formatHistoryForPrompt(history) {
  if (!history?.task_summary) return '';
  return `Client's task history (last ${HISTORY_DAYS} days):\n${history.task_summary}`;
}