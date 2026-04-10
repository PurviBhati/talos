// services/slackBatchScanner.js
// OpenClaw – Slack 30-Min Batch Task Scanner
// Built by AppsRow Solutions LLP
//
// Runs every 30 minutes. For each mapped Slack channel:
//   1. Fetches unscanned standalone messages (not in threads) from last 30 mins
//   2. Fetches last 20 messages as context
//   3. Uses GPT-4o to extract distinct tasks
//   4. Sends clean task card to correct Teams channel
//   5. Marks messages as batch_scanned = TRUE

import { query } from '../db/index.js';
import { getClientHistory, updateClientHistory, formatHistoryForPrompt } from './clientHistory.js';
import { filterExtractedTasksForForward } from '../utils/forwardPolicy.js';
import { getOpenAIClient, getOpenAIModel } from './runtimeAiConfig.js';


const SCAN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const SCAN_WINDOW_MINS = 30;
const CONTEXT_MESSAGES = 20;

function isLikelyTaskText(text = '') {
  const t = String(text || '').toLowerCase();
  if (!t.trim()) return false;
  if (/https?:\/\//.test(t)) return true;
  const keywords = [
    'please', 'urgent', 'asap', 'fix', 'update', 'change', 'remove', 'add',
    'make', 'need', 'issue', 'bug', 'error', 'not working', 'kindly'
  ];
  return keywords.some((k) => t.includes(k));
}

function normalizeTaskText(value = '') {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function dedupeTasks(tasks = []) {
  const out = [];
  const seen = new Set();
  for (const task of tasks) {
    const title = normalizeTaskText(task?.title || '');
    const desc = normalizeTaskText(task?.description || '');
    if (!title && !desc) continue;
    const key = `${title}|${desc.slice(0, 120)}`;
    if (seen.has(key)) continue;
    const near = out.some((t) => {
      const tTitle = normalizeTaskText(t?.title || '');
      if (!title || !tTitle) return false;
      return title === tTitle || title.includes(tTitle) || tTitle.includes(title);
    });
    if (near) continue;
    seen.add(key);
    out.push(task);
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// DB HELPERS
// ─────────────────────────────────────────────────────────────────────────────

// Fetch all active Slack channel mappings
async function fetchMappedChannels() {
  const result = await query(
    `SELECT cm.tenant_id, cm.slack_channel_id, cm.slack_channel_name,
            cm.teams_chat_id AS conversation_id,
            cm.teams_chat_name AS conversation_name
     FROM channel_mappings cm
     WHERE cm.active = true
       AND cm.teams_chat_id IS NOT NULL
       AND cm.slack_channel_id IS NOT NULL
       AND cm.slack_channel_id != 'none'
       AND cm.slack_channel_id != ''`
  );
  return result.rows;
}

async function fetchUnscannedMessages(tenantId, channelId) {
  // New unscanned standalone messages (not thread replies) from last 30 mins
  const unscanned = await query(
    `SELECT id, sender, body, timestamp, files
     FROM slack_messages
     WHERE tenant_id = $1
       AND channel_id = $2
       AND (batch_scanned IS NULL OR batch_scanned = FALSE)
       AND (dismissed IS NULL OR dismissed = FALSE)
       AND (forwarded_to_teams IS NULL OR forwarded_to_teams = FALSE)
       AND timestamp <= NOW() - INTERVAL '30 seconds'
     ORDER BY timestamp ASC`,
    [tenantId, channelId]
  );

  if (!unscanned.rows.length) return { newMessages: [], allMessages: [] };

  // Fetch last N messages as context (excluding current unscanned batch)
  const unscannedIds = unscanned.rows.map(m => m.id);
  const context = await query(
    `SELECT id, sender, body, timestamp
     FROM slack_messages
     WHERE tenant_id = $1
       AND channel_id = $2
       AND (dismissed IS NULL OR dismissed = FALSE)
       AND id != ALL($3)
       AND body IS NOT NULL
       AND body != ''
     ORDER BY timestamp DESC
     LIMIT $4`,
    [tenantId, channelId, unscannedIds.length ? unscannedIds : [0], CONTEXT_MESSAGES]
  );

  const contextRows = context.rows.reverse().map(m => ({ ...m, is_context: true }));
  const newRows = unscanned.rows.map(m => ({ ...m, is_context: false }));

  return {
    newMessages: newRows,
    allMessages: [...contextRows, ...newRows]
  };
}

async function markBatchScanned(tenantId, messageIds) {
  if (!messageIds.length) return;
  await query(
    `UPDATE slack_messages SET batch_scanned = TRUE WHERE tenant_id = $1 AND id = ANY($2)`,
    [tenantId, messageIds]
  );
}

// Log failed forward for retry
async function logFailedForward({ tenantId, source, channelId, channelName, teamsChatId, teamsChatName, card, error }) {
  try {
    await query(
      `INSERT INTO forward_logs
         (tenant_id, source, group_name, sender, message_preview, teams_chat_id, teams_chat_name, card_content, status, failure_reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'failed',$9,NOW())`,
      [tenantId, source, channelName, 'OpenClaw', card.slice(0, 200), teamsChatId, teamsChatName, card, error]
    );
    console.log(`📝 Failed forward logged for retry: ${channelName}`);
  } catch (err) {
    console.error(`❌ Failed to log forward:`, err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI — Extract distinct tasks with context
// ─────────────────────────────────────────────────────────────────────────────

async function extractTasks(allMessages, channelName, history = null) {
  const messageBlock = allMessages.map(m => {
    const files = (() => { try { return JSON.parse(m.files || '[]'); } catch { return []; } })();
    const fileNote = files.length > 0 ? ` [+${files.length} file(s)]` : '';
    const contextTag = m.is_context ? ' [context]' : '';
    return `[${m.sender}${fileNote}${contextTag}]: ${m.body || '(file only)'}`;
  }).join('\n');

  const historyBlock = history ? `\n${formatHistoryForPrompt(history)}\n` : '';

  const prompt = `You are OpenClaw, an AI task extractor for AppsRow (Webflow agency).

Analyze these Slack messages from channel "${channelName}".
${historyBlock}
Messages marked [context] are previous messages for reference — do NOT create tasks from them unless a new message directly references them.
Messages without [context] are NEW messages that need to be processed.

ONLY output work **tasks** (dev/design/Webflow/content/bugfix) or **client_approval** of a specific deliverable. 
Do NOT create items for: meetings, scheduling, invoices, payments, billing, general chat, or social talk.

Rules:
- EXCLUDE FLUFF: No greetings-only or filler as standalone tasks.
- CLIENT APPROVAL: "ok"/"👍" only when approving project work — category "client_approval".
- Group related new messages into one task where appropriate.
- If no qualifying item in NEW messages, return []

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "title": "Short action-oriented task name",
    "description": "Full clear description focusing ONLY on actionable parts. At least 2 sentences.",
    "category": "change_request | new_project | feedback | urgent | follow_up | client_approval",
    "priority": "high | medium | low",
    "files": [],
    "links": []
  }
]

Messages:
${messageBlock}`;

  const response = await getOpenAIClient().chat.completions.create({
    model: getOpenAIModel(),
    temperature: 0.2,
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const raw = response.choices[0].message.content.trim().replace(/^```json|^```|```$/gm, '').trim();
    const tasks = JSON.parse(raw);
    return Array.isArray(tasks) ? tasks : [];
  } catch (err) {
    console.error('❌ Failed to parse GPT task extraction:', err.message);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT — Clean Teams card matching your design
// ─────────────────────────────────────────────────────────────────────────────

// Aprroval card 
function formatApprovalCard(task, groupName) {
  return [
    `✅ **Client Approval from ${groupName}**`,
    `─────────────────────────────`,
    ``,
    task.description || task.title,
  ].join('\n');
}


function formatTaskCard(task, channelName) {
  const lines = [
    `📌 **New Task from #${channelName}**`,
    `─────────────────────────────`,
    ``,
    `**Task:** ${task.title}`,
    ``,
    task.description || '*(See links/files below for full context)*',
  ];

  if (task.files?.length) {
    lines.push(``);
    lines.push(`📎 **Files:** ${task.files.join(', ')}`);
  }

  if (task.links?.length) {
    lines.push(``);
    lines.push(`🔗 **Links:**`);
    task.links.forEach(link => lines.push(link));
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN — Process one Slack channel
// ─────────────────────────────────────────────────────────────────────────────

async function scanChannel(channel) {
  const { tenant_id, slack_channel_id, slack_channel_name, conversation_id, conversation_name } = channel;
  console.log(`🔍 Slack batch scanning: "#${slack_channel_name}"`);

  const { newMessages, allMessages } = await fetchUnscannedMessages(tenant_id, slack_channel_id);

  if (!newMessages.length) {
    console.log(`⏭️  No new messages in "#${slack_channel_name}"`);
    return { channel: slack_channel_name, tasksFound: 0, status: 'no_messages' };
  }

  console.log(`📨 "#${slack_channel_name}" — ${newMessages.length} new + ${allMessages.length - newMessages.length} context messages`);

  // Fetch client history for context
  const history = await getClientHistory(tenant_id, 'slack', slack_channel_id);

  const rawTasks = await extractTasks(allMessages, slack_channel_name, history);
  const filteredTasks = filterExtractedTasksForForward(rawTasks);
  const tasks = dedupeTasks(filteredTasks);

  if (!tasks.length) {
    if (rawTasks.length > 0) {
      await markBatchScanned(tenant_id, newMessages.map(m => m.id));
      console.log(`✅ "#${slack_channel_name}" — model output filtered (not task/approval)`);
      return { channel: slack_channel_name, tasksFound: 0, status: 'filtered_non_tasks' };
    }
    const hasPotentialTask = newMessages.some((m) => isLikelyTaskText(m.body) || (() => { try { return JSON.parse(m.files || '[]').length > 0; } catch { return false; } })());
    if (hasPotentialTask) {
      console.log(`⏸️ "#${slack_channel_name}" — no tasks extracted, deferring scan mark to retry missed tasks on next message`);
      return { channel: slack_channel_name, tasksFound: 0, status: 'deferred_no_tasks' };
    }
    await markBatchScanned(tenant_id, newMessages.map(m => m.id));
    console.log(`✅ "#${slack_channel_name}" — no actionable tasks`);
    return { channel: slack_channel_name, tasksFound: 0, status: 'no_tasks' };
  }

  if (filteredTasks.length !== tasks.length) {
    console.log(`🧹 "#${slack_channel_name}" — deduped ${filteredTasks.length - tasks.length} near-duplicate task(s)`);
  }
  console.log(`✅ "#${slack_channel_name}" — ${tasks.length} task(s) found`);

  const { sendToGroupChat, sendImageToGroupChat } = await import('./teamsService.js');

  // Collect all file URLs from new messages
  const allFileUrls = newMessages.flatMap(m => {
    const files = (() => { try { return JSON.parse(m.files || '[]'); } catch { return []; } })();
    return files.map(f => f.publicUrl || f.url).filter(Boolean);
  });

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];
    const card = task.category === 'client_approval'
      ? formatApprovalCard(task, slack_channel_name)
      : formatTaskCard(task, slack_channel_name);

    try {
      await sendToGroupChat(conversation_id, card);

      // Attach files to first task card only
      if (i === 0 && allFileUrls.length > 0) {
        for (const fileUrl of allFileUrls) {
          try {
            await sendImageToGroupChat(conversation_id, fileUrl, null);
            console.log(`📎 Slack file forwarded: ${fileUrl}`);
          } catch (imgErr) {
            console.warn(`⚠️ File forward failed: ${imgErr.message}`);
          }
        }
      }

      console.log(`📤 Slack task sent: "${task.title}" → ${conversation_name}`);
    } catch (err) {
      console.error(`❌ Failed to send task "${task.title}":`, err.message);
      await logFailedForward({
        tenantId: tenant_id,
        source: 'slack',
        channelId: slack_channel_id,
        channelName: slack_channel_name,
        teamsChatId: conversation_id,
        teamsChatName: conversation_name,
        card,
        error: err.message,
      });
    }
  }

  // Update client history with new tasks
  await updateClientHistory(tenant_id, 'slack', slack_channel_id, slack_channel_name, tasks);
  await markBatchScanned(tenant_id, newMessages.map(m => m.id));

  return { channel: slack_channel_name, tasksFound: tasks.length, status: 'ok' };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — Scan all mapped Slack channels
// ─────────────────────────────────────────────────────────────────────────────

export async function runSlackBatchScan() {
  console.log(`\n⏰ [${new Date().toISOString()}] OpenClaw Slack Batch Scan — START`);

  const channels = await fetchMappedChannels();

  if (!channels.length) {
    console.log('⚠️  No mapped Slack channels found');
    return [];
  }

  const results = [];
  for (const channel of channels) {
    try {
      results.push(await scanChannel(channel));
    } catch (err) {
      console.error(`❌ Scan failed for "#${channel.slack_channel_name}":`, err.message);
      results.push({ channel: channel.slack_channel_name, status: 'error', error: err.message });
    }
  }

  console.log(`✅ [${new Date().toISOString()}] OpenClaw Slack Batch Scan — DONE`);
  console.table(results);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULER
// ─────────────────────────────────────────────────────────────────────────────

let slackScannerInterval = null;
let slackScannerTimeout = null;

export function startSlackBatchScanner() {
  console.log(`🕐 Slack Batch Scanner — every ${SCAN_INTERVAL_MS / 60000} mins`);
  slackScannerTimeout = setTimeout(() => runSlackBatchScan().catch(console.error), SCAN_INTERVAL_MS);
  slackScannerInterval = setInterval(() => runSlackBatchScan().catch(console.error), SCAN_INTERVAL_MS);
}

export function stopSlackBatchScanner() {
  if (slackScannerTimeout) clearTimeout(slackScannerTimeout);
  if (slackScannerInterval) {
    console.log('🛑 Stopping Slack batch scanner...');
    clearInterval(slackScannerInterval);
  }
}

