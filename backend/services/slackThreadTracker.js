import { WebClient } from "@slack/web-api";
import { query } from "../db/index.js";
import { uploadSlackFileToSupabase } from "./storageService.js";
import { filterExtractedTasksForForward } from "../utils/forwardPolicy.js";
import { getOpenAIClient, getOpenAIModel } from "./runtimeAiConfig.js";

const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

// Forward on every new client reply
const FORWARD_EVERY_N = 1;

// Number of previous channel messages to include as context
const CONTEXT_MESSAGES = 20;

// Internal Slack user IDs to filter out
const INTERNAL_USER_IDS = (process.env.SLACK_INTERNAL_USER_IDS || "")
  .split(",").map(id => id.trim()).filter(Boolean);

// ─────────────────────────────────────────────────────────────────────────────
// DB HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function getThreadRecord(threadId) {
  const result = await query(
    `SELECT * FROM slack_threads WHERE thread_id = $1`,
    [threadId]
  );
  return result.rows[0] || null;
}

async function upsertThreadRecord(record) {
  const { thread_id, channel_id, channel_name, summary, client_reply_count, last_processed_ts, forwarded_at_counts } = record;
  await query(
    `INSERT INTO slack_threads
       (thread_id, channel_id, channel_name, summary, client_reply_count,
        last_processed_ts, forwarded_at_counts, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, NOW(), NOW())
     ON CONFLICT (thread_id) DO UPDATE SET
       summary             = EXCLUDED.summary,
       client_reply_count  = EXCLUDED.client_reply_count,
       last_processed_ts   = EXCLUDED.last_processed_ts,
       forwarded_at_counts = EXCLUDED.forwarded_at_counts,
       updated_at          = NOW()`,
    [thread_id, channel_id, channel_name || channel_id, summary, client_reply_count, last_processed_ts, JSON.stringify(forwarded_at_counts || [])]
  );
}

// Fetch recent channel messages as context (excluding current thread)
async function fetchChannelContext(channelId, threadId) {
  try {
    const result = await query(
      `SELECT sender, body, timestamp
       FROM slack_messages
       WHERE channel_id = $1
         AND (dismissed IS NULL OR dismissed = FALSE)
         AND body IS NOT NULL
         AND body != ''
       ORDER BY timestamp DESC
       LIMIT $2`,
      [channelId, CONTEXT_MESSAGES]
    );
    return result.rows.reverse(); // chronological order
  } catch {
    return [];
  }
}

// Lookup Teams target directly from channel_mappings.
async function getTeamsChatForSlackChannel(channelId, channelName) {
  try {
    const result = await query(
      `SELECT cm.teams_chat_id AS conversation_id,
              cm.teams_chat_name AS conversation_name
       FROM channel_mappings cm
       WHERE (cm.slack_channel_id = $1 OR LOWER(cm.slack_channel_name) = LOWER($2))
         AND cm.active = true
         AND cm.teams_chat_id IS NOT NULL
       LIMIT 1`,
      [channelId, channelName]
    );
    if (result.rows[0]) return result.rows[0];
    console.warn(`⚠️  No Teams mapping for Slack channel "${channelName}" — skipping`);
    return null;
  } catch (err) {
    console.error(`❌ getTeamsChatForSlackChannel error:`, err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SLACK HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function isClientMessage(message) {
  const subtype = message.subtype || "";
  if (["bot_message", "channel_join", "channel_leave"].includes(subtype)) return false;
  if (message.bot_id) return false;
  if (INTERNAL_USER_IDS.includes(message.user)) return false;
  return true;
}

async function fetchThreadMessages(channelId, threadTs) {
  const result = await slack.conversations.replies({ channel: channelId, ts: threadTs, limit: 200 });
  return result.messages || [];
}

async function collectPublicFileUrls(messages = []) {
  const urls = [];
  const proxyBase = `http://localhost:${process.env.PORT || 5000}`;
  for (const m of messages) {
    const files = Array.isArray(m.files) ? m.files : [];
    for (const f of files) {
      try {
        // Prefer already-public URL if present
        if (f.publicUrl && /^https?:\/\//.test(f.publicUrl)) {
          urls.push(f.publicUrl);
          continue;
        }
        const privateUrl = f.url_private_download || f.url_private || f.url;
        if (!privateUrl) continue;
        const uploaded = await uploadSlackFileToSupabase(privateUrl, f.name || f.id || "thread_file", f.mimetype);
        if (uploaded) {
          urls.push(uploaded);
          continue;
        }
        // Fallback: local proxy URL that server can fetch and re-upload for Teams delivery.
        urls.push(`${proxyBase}/api/files/proxy?url=${encodeURIComponent(privateUrl)}`);
      } catch (err) {
        console.warn(`⚠️ Thread file upload failed: ${err.message}`);
      }
    }
  }
  // Unique URLs only
  return [...new Set(urls)];
}

async function resolveUserName(userId) {
  try {
    const info = await slack.users.info({ user: userId });
    return info.user?.profile?.display_name || info.user?.real_name || info.user?.name || userId;
  } catch {
    return userId;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AI — Extract task from thread with channel context
// ─────────────────────────────────────────────────────────────────────────────

async function extractTaskFromThread(threadMessages, contextMessages, channelName) {
  // Build context block from previous channel messages
  const contextBlock = contextMessages.length > 0
    ? contextMessages.map(m => `[${m.sender}][context]: ${m.body}`).join('\n')
    : '';

  // Build thread block
  const threadBlock = threadMessages
    .map(m => `[${m.resolvedName || m.user}]: ${m.text || ''}`)
    .join('\n');

const prompt = `You are OpenClaw, an AI task extractor for AppsRow (Webflow agency).

Analyze this Slack thread from channel "${channelName}" and extract at most ONE item.

${contextBlock ? `Previous channel messages (for context — do NOT create tasks from these):\n${contextBlock}\n\n` : ''}Thread messages (extract from these):
${threadBlock}

ONLY output a work **task** (dev/design/Webflow/bugfix) OR **client_approval** of a specific deliverable.
Do NOT output items about: meetings, scheduling, invoices, payments, billing, or general chat.

Rules:
- Use context to resolve "this"/"that" to specific work.
- CLIENT APPROVAL: "ok"/"👍" only when approving project work — set "category": "client_approval".
- If nothing qualifies, return null.

Return ONLY valid JSON, no markdown:
{
  "title": "Short action-oriented task name",
  "description": "Full clear description. At least 2 sentences.",
  "category": "change_request | new_project | feedback | urgent | follow_up | client_approval",
  "priority": "high | medium | low",
  "files": [],
  "links": []
}

If no actionable task or approval, return: null`;

  const response = await getOpenAIClient().chat.completions.create({
    model: getOpenAIModel(),
    temperature: 0.2,
    max_tokens: 600,
    messages: [{ role: "user", content: prompt }],
  });

  try {
    const raw = response.choices[0].message.content.trim().replace(/^```json|^```|```$/gm, '').trim();
    if (raw === 'null' || !raw) return null;
    const parsed = JSON.parse(raw);
    const filtered = filterExtractedTasksForForward([parsed]);
    return filtered[0] || null;
  } catch (err) {
    console.error('❌ Failed to parse GPT task extraction:', err.message);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FORMAT — Clean Teams card matching your design
// ─────────────────────────────────────────────────────────────────────────────

function formatApprovalCard(task, channelName) {
  return [
    `✅ **Client Approval from #${channelName}**`,
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
// FORWARD TO TEAMS
// ─────────────────────────────────────────────────────────────────────────────

async function forwardTaskToTeams({ threadId, channelId, channelName, task, fileUrls = [] }) {
  const conv = await getTeamsChatForSlackChannel(channelId, channelName);
  if (!conv) return { success: false, error: 'no teams mapping' };

  const { sendToGroupChat, sendImageToGroupChat } = await import("./teamsService.js");
  const card =
    task.category === "client_approval"
      ? formatApprovalCard(task, channelName)
      : formatTaskCard(task, channelName);

  try {
    await sendToGroupChat(conv.conversation_id, card);

    // Forward files/images
    for (const fileUrl of fileUrls) {
      try {
        await sendImageToGroupChat(conv.conversation_id, fileUrl, null);
        console.log(`📎 Slack file forwarded: ${fileUrl}`);
      } catch (imgErr) {
        console.warn(`⚠️ File forward failed: ${imgErr.message}`);
      }
    }

    console.log(`✅ Slack task forwarded: "${task.title}" → ${conv.conversation_name}`);
    return { success: true };
  } catch (err) {
    console.error(`❌ Slack task forward failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────

export async function handleSlackThreadEvent(event, { channelId, channelName, senderName }) {
  const ts = event.ts || "";
  const threadTs = event.thread_ts;
  const isReply = threadTs && threadTs !== ts;
  const isMainMessage = !threadTs;

  // Store main message as potential thread root
  if (isMainMessage) {
    const existing = await getThreadRecord(ts);
    if (!existing) {
      await upsertThreadRecord({
        thread_id: ts,
        channel_id: channelId,
        channel_name: channelName,
        summary: null,
        client_reply_count: 0,
        last_processed_ts: ts,
        forwarded_at_counts: [],
      });

      // Forward main message immediately if it's a client message
      if (isClientMessage(event)) {
        const contextMessages = await fetchChannelContext(channelId, ts);
        const mainMsg = { ...event, resolvedName: senderName };
        const task = await extractTaskFromThread([mainMsg], contextMessages, channelName);

        if (task) {
          const fileUrls = await collectPublicFileUrls([event]);
          await forwardTaskToTeams({ threadId: ts, channelId, channelName, task, fileUrls });
          await upsertThreadRecord({
            thread_id: ts,
            channel_id: channelId,
            channel_name: channelName,
            summary: task.title,
            client_reply_count: 1,
            last_processed_ts: ts,
            forwarded_at_counts: [1],
          });
          console.log(`🧵 Main message task forwarded: "${task.title}"`);
        }
      }
    }
    return { status: "thread_root_stored", threadId: ts };
  }

  // ── Thread reply ──────────────────────────────────────────────────────────
  const threadId = threadTs;
  const record = await getThreadRecord(threadId);
  const lastProcessedTs = record?.last_processed_ts || threadId;
  const prevCount = record?.client_reply_count || 0;
  const forwardedAtCounts = record?.forwarded_at_counts || [];

  // Fetch full thread
  const allMessages = await fetchThreadMessages(channelId, threadId);
  const newMessages = allMessages.filter(m => parseFloat(m.ts) > parseFloat(lastProcessedTs));
  const clientMessages = newMessages.filter(isClientMessage);

  if (clientMessages.length === 0) {
    console.log(`⏭️  No new client messages in thread ${threadId}`);
    return { status: "skipped", reason: "no_new_client_messages", threadId };
  }

  // Resolve names
  for (const m of clientMessages) {
    m.resolvedName = await resolveUserName(m.user).catch(() => m.user);
  }

  // Keep reply extraction strictly thread-scoped to avoid cross-thread contamination.
  // We only provide already-seen messages from the same thread as context.
  const previousThreadMessages = allMessages
    .filter(m => parseFloat(m.ts) <= parseFloat(lastProcessedTs) && isClientMessage(m))
    .map(m => ({ sender: m.resolvedName || m.user, body: m.text || '' }));
  const allContext = previousThreadMessages;

  // Extract task
  const task = await extractTaskFromThread(clientMessages, allContext, channelName);

  const newCount = prevCount + clientMessages.length;
  const latestTs = clientMessages.reduce(
    (max, m) => (parseFloat(m.ts) > parseFloat(max) ? m.ts : max),
    lastProcessedTs
  );

  let actionTaken = "summary_updated";

  if (task) {
    const prevThreshold = Math.floor(prevCount / FORWARD_EVERY_N) * FORWARD_EVERY_N;
    const newThreshold = Math.floor(newCount / FORWARD_EVERY_N) * FORWARD_EVERY_N;

    if (newThreshold > prevThreshold && !forwardedAtCounts.includes(newThreshold)) {
      const fileUrls = await collectPublicFileUrls(clientMessages);

      await forwardTaskToTeams({ threadId, channelId, channelName, task, fileUrls });
      forwardedAtCounts.push(newThreshold);
      actionTaken = "forwarded_to_teams";
    }
  }

  await upsertThreadRecord({
    thread_id: threadId,
    channel_id: channelId,
    channel_name: channelName,
    summary: task?.title || null,
    client_reply_count: newCount,
    last_processed_ts: latestTs,
    forwarded_at_counts: forwardedAtCounts,
  });

  console.log(`🧵 Thread ${threadId} updated — ${newCount} client replies | action: ${actionTaken}`);
  return { status: "ok", threadId, actionTaken, clientRepliesTotal: newCount };
}