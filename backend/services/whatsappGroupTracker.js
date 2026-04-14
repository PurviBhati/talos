// services/whatsappGroupTracker.js
// OpenClaw – WhatsApp 30-Min Grouped Task Scanner
// Built by AppsRow Solutions LLP
//
// Runs every 30 minutes. For each WhatsApp group:
//   1. Fetches unscanned messages from last 30 mins
//   2. Fetches last 5 already-scanned messages as context (so GPT understands "Any update on this?" etc.)
//   3. Groups related messages into distinct tasks using GPT-4o
//   4. Sends one clean task card per task to the correct Teams channel
//   5. Marks messages as scanned to prevent duplicates

import { query as db } from '../db/index.js';
import { getClientHistory, updateClientHistory, formatHistoryForPrompt } from './clientHistory.js';
import { filterExtractedTasksForForward } from '../utils/forwardPolicy.js';
import { getOpenAIClient, getOpenAIModel } from './runtimeAiConfig.js';


const SCAN_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const SCAN_WINDOW_MINS = 30;
const CONTEXT_MESSAGES = 5; // how many previous messages to include as context

function isTemporaryDbError(err) {
  const code = String(err?.code || '').toUpperCase();
  const msg = String(err?.message || '').toLowerCase();
  return (
    code === 'DB_BACKOFF_ACTIVE' ||
    code === 'ENOTFOUND' ||
    code === 'ECONNABORTED' ||
    code === 'ETIMEDOUT' ||
    code === 'ECONNRESET' ||
    msg.includes('temporarily unavailable') ||
    msg.includes('connection terminated') ||
    msg.includes('dbhandler')
  );
}

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

async function fetchMessages(tenantId, groupName) {
  // 1. Fetch new unscanned messages from last 30 mins
  const unscanned = await db(
    `SELECT id, sender, body, timestamp, media_urls, FALSE AS is_context
     FROM whatsapp_messages
     WHERE tenant_id = $1
       AND group_name = $2
       AND direction = 'inbound'
       AND (batch_scanned IS NULL OR batch_scanned = FALSE)
       AND (dismissed IS NULL OR dismissed = FALSE)
       AND (forwarded_to_teams IS NULL OR forwarded_to_teams = FALSE)
       AND timestamp <= NOW() - INTERVAL '30 seconds'
     ORDER BY timestamp ASC`,
    [tenantId, groupName]
  );

  // If no new messages, nothing to process
  if (!unscanned.rows.length) return { newMessages: [], allMessages: [] };

  // 2. Fetch last N already-scanned messages as context for GPT
  const context = await db(
    `SELECT id, sender, body, timestamp, media_urls, TRUE AS is_context
     FROM whatsapp_messages
     WHERE tenant_id = $1
       AND group_name = $2
       AND direction = 'inbound'
       AND batch_scanned = TRUE
       AND (dismissed IS NULL OR dismissed = FALSE)
     ORDER BY timestamp DESC
     LIMIT $3`,
    [tenantId, groupName, CONTEXT_MESSAGES]
  );

  const parseMediaUrls = m => ({
    ...m,
    mediaUrls: (() => { try { return JSON.parse(m.media_urls || '[]'); } catch { return []; } })()
  });

  // Context messages reversed to chronological order, then new messages
  const contextRows = context.rows.reverse().map(parseMediaUrls);
  const newRows = unscanned.rows.map(parseMediaUrls);

  return {
    newMessages: newRows,                    // only these get marked as scanned
    allMessages: [...contextRows, ...newRows] // full context sent to GPT
  };
}

async function markBatchScanned(tenantId, messageIds) {
  if (!messageIds.length) return;
  await db(
    `UPDATE whatsapp_messages SET batch_scanned = TRUE WHERE tenant_id = $1 AND id = ANY($2)`,
    [tenantId, messageIds]
  );
}

async function saveTaskLog({ tenantId, groupName, title, description, category, priority, files, links, teamsChatId, forwarded }) {
  await db(
    `INSERT INTO whatsapp_batch_tasks
       (tenant_id, group_name, task_title, description, category, priority, files, links, teams_chat_id, forwarded, scanned_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,NOW())`,
    [tenantId, groupName, title, description, category, priority, JSON.stringify(files || []), JSON.stringify(links || []), teamsChatId, forwarded]
  );
}

// Log failed forward for retry
async function logFailedForward({ tenantId, source, groupName, teamsChatId, teamsChatName, card, error }) {
  try {
    await db(
      `INSERT INTO forward_logs
         (tenant_id, source, group_name, sender, message_preview, teams_chat_id, teams_chat_name, card_content, status, failure_reason, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'failed',$9,NOW())`,
      [tenantId, source, groupName, 'OpenClaw', card.slice(0, 200), teamsChatId, teamsChatName, card, error]
    );
    console.log(`📝 Failed forward logged for retry: ${groupName}`);
  } catch (err) {
    console.error(`❌ Failed to log forward:`, err.message);
  }
}

// Prevent duplicate task cards within 30 mins
async function isDuplicateTask(tenantId, groupName, title) {
  const result = await db(
    `SELECT id FROM whatsapp_batch_tasks
     WHERE tenant_id = $1
       AND group_name = $2
       AND LOWER(task_title) = LOWER($3)
       AND scanned_at >= NOW() - INTERVAL '30 minutes'
     LIMIT 1`,
    [tenantId, groupName, title]
  );
  return result.rows.length > 0;
}

// Lookup Teams target directly from channel_mappings.
async function getTeamsChatId(tenantId, groupName) {
  try {
    const result = await db(
      `SELECT cm.teams_chat_id AS conversation_id,
              cm.teams_chat_name AS conversation_name
       FROM channel_mappings cm
       WHERE cm.tenant_id = $1
         AND TRIM(cm.whatsapp_group_name) = TRIM($2)
         AND cm.active = true
         AND cm.teams_chat_id IS NOT NULL
       LIMIT 1`,
      [tenantId, groupName]
    );
    if (result.rows[0]) return result.rows[0];
    console.warn(`⚠️  No Teams mapping for WhatsApp group "${groupName}" — skipping`);
    return null;
  } catch (err) {
    console.error(`❌ getTeamsChatId error:`, err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI — Extract distinct tasks with full conversation context
// ─────────────────────────────────────────────────────────────────────────────

async function extractGroupedTasks(allMessages, groupName, history = null) {
  const messageBlock = allMessages.map(m => {
    const media = m.mediaUrls?.length > 0 ? ` [+${m.mediaUrls.length} file(s)]` : '';
    const contextTag = m.is_context ? ' [context]' : '';
    return `[${m.sender}${media}${contextTag}]: ${m.body || '(media only)'}`;
  }).join('\n');

  const historyBlock = history ? `\n${formatHistoryForPrompt(history)}\n` : '';

  const prompt = `You are OpenClaw, an AI task extractor for AppsRow (Webflow agency).

  Analyze these WhatsApp messages from the client group "${groupName}".
  ${historyBlock}
  Messages marked [context] are previous messages included for reference — do NOT create tasks from them unless a new message directly references them.
  Messages without [context] are the NEW messages that need to be processed.

  FORWARDING RULE — Only output items that are EITHER:
  (1) A concrete **work task** for the dev/design team (site, Webflow, content, bugfix, design feedback with clear action), OR
  (2) **client_approval** of a specific deliverable / design / milestone (category must be "client_approval").

  NEVER create tasks for: meetings, calls, scheduling, calendar, invoices, payments, billing, quotes, general chat, small talk, or "let's sync".

  STRICT TRANSFORMATION RULES:
  1. If a client sends 4 messages in a row about one bug, merge them into ONE task.
  2. FOLLOW-UPS: If a client asks "Any update?", title "Status Request: [Original Task Name]" with linked context.

  Rules:
- EXCLUDE FLUFF: No greetings-only, thanks-only, or social chatter as standalone tasks.
- CLIENT APPROVAL: "ok"/"👍" only when approving **project work** already in context — category "client_approval".
- If no qualifying item in NEW messages, return []

Return ONLY a valid JSON array, no markdown, no explanation:
[
  {
    "title": "Action-oriented title",
    "description": "2-3 sentences max. Plain English.",
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
// FORMAT — Clean Teams card
// ─────────────────────────────────────────────────────────────────────────────

function formatTaskCard(task, groupName) {
  const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
  const lines = [
    `📌 **New Task from ${groupName}**`,
    `─────────────────────────────`,
    ``,
    `**Task:** ${task.title}`,
    `**Priority:** ${priorityEmoji} ${task.priority}`,
    ``,
    task.description,
  ];

  if (task.files?.length) {
    lines.push(``);
    lines.push(`📎 **Files:** ${task.files.join(', ')}`);
  }

  if (task.links?.length) {
    const relevantLinks = task.links.filter(l => !l.includes('meet.google.com'));
    if (relevantLinks.length) {
      lines.push(``);
      lines.push(`🔗 **Links:**`);
      relevantLinks.forEach(link => lines.push(link));
    }
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// SCAN — Process one WhatsApp group
// ─────────────────────────────────────────────────────────────────────────────

async function scanGroup(tenantId, groupName) {
  console.log(`🔍 Batch scanning: "${groupName}"`);

  const { newMessages, allMessages } = await fetchMessages(tenantId, groupName);

  if (!newMessages.length) {
    console.log(`⏭️  No new messages in "${groupName}"`);
    return { groupName, tasksFound: 0, status: 'no_messages' };
  }

  console.log(`📨 "${groupName}" — ${newMessages.length} new messages + ${allMessages.length - newMessages.length} context messages`);

  // Fetch client history for context
  const history = await getClientHistory(tenantId, 'whatsapp', groupName);

  // Extract tasks using full context + history
  const rawTasks = await extractGroupedTasks(allMessages, groupName, history);
  const filteredTasks = filterExtractedTasksForForward(rawTasks);
  const tasks = dedupeTasks(filteredTasks);

  if (!tasks.length) {
    if (rawTasks.length > 0) {
      await markBatchScanned(tenantId, newMessages.map(m => m.id));
      console.log(`✅ "${groupName}" — model output filtered out (meetings/chat/invoices — not forwarded)`);
      return { groupName, tasksFound: 0, status: 'filtered_non_tasks' };
    }
    const hasPotentialTask = newMessages.some((m) => isLikelyTaskText(m.body) || (m.mediaUrls || []).length > 0);
    if (hasPotentialTask) {
      console.log(`⏸️ "${groupName}" — no tasks extracted, deferring scan mark to retry missed tasks on next message`);
      return { groupName, tasksFound: 0, status: 'deferred_no_tasks' };
    }
    await markBatchScanned(tenantId, newMessages.map(m => m.id));
    console.log(`✅ "${groupName}" — no actionable tasks`);
    return { groupName, tasksFound: 0, status: 'no_tasks' };
  }

  if (filteredTasks.length !== tasks.length) {
    console.log(`🧹 "${groupName}" — deduped ${filteredTasks.length - tasks.length} near-duplicate task(s)`);
  }
  console.log(`✅ "${groupName}" — ${tasks.length} task(s) found`);

  // Lookup Teams chat from DB
  const conv = await getTeamsChatId(tenantId, groupName);
  if (!conv) {
    console.log(`⏸️ "${groupName}" — tasks found but no Teams mapping; keeping messages unscanned`);
    return { groupName, tasksFound: tasks.length, status: 'no_teams_mapping' };
  }

  const { sendToGroupChat, sendImageToGroupChat } = await import('./teamsService.js');

  // Collect all media from new messages only
  const allMediaUrls = newMessages.flatMap(m => m.mediaUrls || []).filter(Boolean);
  console.log(`🖼️ Media URLs found:`, allMediaUrls);
  console.log(`📦 New messages:`, newMessages.map(m => ({ id: m.id, mediaUrls: m.mediaUrls })));

  for (let i = 0; i < tasks.length; i++) {
    const task = tasks[i];

    // Skip duplicates
    const duplicate = await isDuplicateTask(tenantId, groupName, task.title);
    if (duplicate) {
      console.log(`⏭️  Duplicate task skipped: "${task.title}"`);
      continue;
    }

    const card = formatTaskCard(task, groupName);
    let forwarded = false;

    try {
      const expectedConversationId = String(conv.conversation_id || '').trim();
      if (!expectedConversationId.startsWith('19:')) {
        throw new Error(`Invalid mapped teams_chat_id for "${groupName}": ${expectedConversationId}`);
      }
      await sendToGroupChat(conv.conversation_id, card);

      // Attach images to first task card only
      if (i === 0 && allMediaUrls.length > 0) {
        for (const mediaUrl of allMediaUrls) {
          try {
            await sendImageToGroupChat(conv.conversation_id, mediaUrl, null);
            console.log(`📎 Image forwarded: ${mediaUrl}`);
          } catch (imgErr) {
            console.warn(`⚠️ Image forward failed: ${imgErr.message}`);
          }
        }
      }

      forwarded = true;
      console.log(`📤 Task sent: "${task.title}" → ${conv.conversation_name}`);
    } catch (err) {
      console.error(`❌ Failed to send task "${task.title}":`, err.message);
      await logFailedForward({
        tenantId,
        source: 'whatsapp',
        groupName,
        teamsChatId: conv.conversation_id,
        teamsChatName: conv.conversation_name,
        sender: 'OpenClaw',
        card,
        error: err.message,
      });
    }

    await saveTaskLog({
      tenantId,
      groupName,
      title: task.title,
      description: task.description,
      category: task.category,
      priority: task.priority,
      files: task.files,
      links: task.links,
      teamsChatId: conv.conversation_id,
      forwarded,
    });
  }

  // Update client history with new tasks
  await updateClientHistory(tenantId, 'whatsapp', groupName, groupName, tasks);
  await markBatchScanned(tenantId, newMessages.map(m => m.id));

  return { groupName, tasksFound: tasks.length, status: 'ok' };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN — Scan all groups
// ─────────────────────────────────────────────────────────────────────────────

export async function runWhatsAppGroupScan() {
  console.log(`\n⏰ [${new Date().toISOString()}] OpenClaw Batch Scan — START`);

  const { SELECTED_WHATSAPP_GROUPS } = await import('../config/whatsappGroups.js');
  let tenantRows;
  try {
    tenantRows = await db(`SELECT id FROM tenants`);
  } catch (err) {
    if (isTemporaryDbError(err)) {
      console.warn('⚠️ WhatsApp batch scan skipped: temporary DB outage');
      return [{ status: 'skipped_db_outage' }];
    }
    throw err;
  }
  const results = [];

  for (const tenant of tenantRows.rows) {
    for (const groupName of SELECTED_WHATSAPP_GROUPS) {
      try {
        results.push(await scanGroup(tenant.id, groupName));
      } catch (err) {
        console.error(`❌ Scan failed for "${groupName}" [${tenant.id}]:`, err.message);
        results.push({ tenantId: tenant.id, groupName, status: 'error', error: err.message });
      }
    }
  }

  console.log(`✅ [${new Date().toISOString()}] OpenClaw Batch Scan — DONE`);
  console.table(results);
  return results;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCHEDULER
// ─────────────────────────────────────────────────────────────────────────────

let trackerInterval = null;
let trackerTimeout = null;

export function startWhatsAppGroupTracker() {
  console.log(`🕐 WhatsApp Batch Scanner — every ${SCAN_INTERVAL_MS / 60000} mins`);
  // First scan 5 mins after startup
  trackerTimeout = setTimeout(() => runWhatsAppGroupScan().catch(console.error), 5 * 60 * 1000);
  // Then every 30 mins
  trackerInterval = setInterval(() => runWhatsAppGroupScan().catch(console.error), SCAN_INTERVAL_MS);
}

export function stopWhatsAppGroupTracker() {
  if (trackerTimeout) clearTimeout(trackerTimeout);
  if (trackerInterval) {
    console.log('🛑 Stopping WhatsApp group tracker...');
    clearInterval(trackerInterval);
  }
}
