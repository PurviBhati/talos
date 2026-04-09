// agent/openclawAgent.js
// OpenClaw – AI Routing Engine
// Built by AppsRow Solutions LLP

import OpenAI from "openai";
import { query as db } from "../db/index.js";
import { sendToGroupChat } from "../services/teamsService.js";
import monitoringService from "../services/monitoringService.js";
import { logForward } from "../services/forwardLogger.js";
import { hasBlockedForwardContent, isForwardEligibleCategory } from "../utils/forwardPolicy.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o";

// ─── ANALYSIS CACHE (10 min TTL) ─────────────────────────────────────────────
const analysisCache = new Map();
const CACHE_TTL = 10 * 60 * 1000;

function getCacheKey(content) {
  return content.toLowerCase().trim().slice(0, 100);
}

function getCachedAnalysis(content) {
  const key = getCacheKey(content);
  const cached = analysisCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) return cached.result;
  return null;
}

function setCachedAnalysis(content, result) {
  const key = getCacheKey(content);
  analysisCache.set(key, { result, timestamp: Date.now() });
  if (analysisCache.size > 100) analysisCache.delete(analysisCache.keys().next().value);
}

// ─── QUEUE ────────────────────────────────────────────────────────────────────
let analysisQueue = Promise.resolve();
function queueAnalysis(fn) {
  analysisQueue = analysisQueue.then(() =>
    new Promise(resolve => setTimeout(resolve, 500)).then(fn)
  );
  return analysisQueue;
}

// ─── SLACK SEND ───────────────────────────────────────────────────────────────
async function sendSlack(channelId, text) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch("https://slack.com/api/chat.postMessage", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SLACK_BOT_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel: channelId, text }),
      });
      const data = await r.json();
      if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
      console.log(`✅ Slack message sent`);
      return data;
    } catch (error) {
      console.error(`❌ Slack send attempt ${attempt} failed:`, error.message);
      if (attempt === 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}

// ─── QUICK REJECT ─────────────────────────────────────────────────────────────
function quickReject(content) {
  if (!content || content.trim().length === 0) return "empty message";
  const lower = content.toLowerCase().trim();

  const ignoreKeywords = [
    'please ignore', 'ignore this', 'ignore these task', 'ignore these tasks',
    'no need to do', 'skip this', 'disregard'
  ];
  if (ignoreKeywords.some(k => lower.includes(k))) {
    return "user requested ignore";
  }

  const approvalKeywords = [
    'done', 'approved', 'approve', 'okay', 'ok', 'looks good', 'good',
    'perfect', 'go ahead', 'proceed', 'lgtm', 'confirmed', 'confirm',
    "let's do it", "let's do with it", 'sure', 'fine', 'great', 'yes',
    'agreed', 'accepted', 'cool', 'nice', 'awesome', 'sounds good',
  ];
  if (approvalKeywords.some(k => lower === k || lower === k + '.' || lower === k + '!')) {
    return null;
  }

  const patterns = [
    /^(hi|hello|hey|hii|heyy|yo|sup|howdy|hows\s*everything)[\s!?.]*$/i,
    /^(good\s*(morning|afternoon|evening|night|day))[\s!?.]*$/i,
    /^(thanks|thank\s*you|thx|ty|np|welcome|yw|cheers)[\s!?.]*$/i,
    /^[\u{1F300}-\u{1FFFF}\s!?.]+$/u,
    /^(👋|🙏|😊|❤️|🔥|💯|😄|🎉|✔️|🤝)[\s]*$/,
    /^can\s*we\s*(talk|connect|hop on|jump on|have a call|meet|catch up)[\s!?.]*$/i,
    /^are\s*you\s*free\s*(at|on|today|tomorrow|tonight)/i,
    /^(let's|lets)\s*schedule\s*(a\s*)?(call|meeting|meet)/i,
    /\b(invoice|invoices|payment|billing|quote|quotation|tax invoice|purchase order)\b/i,
    /\b(meet(ing)?\s+(tomorrow|today|on|at)|schedule\s+(a\s*)?(call|meeting|sync)|calendar\s+invite|book\s+(a\s*)?(slot|time))\b/i,
  ];

  for (const p of patterns) {
    if (p.test(lower)) return `greeting/meeting: "${content.trim()}"`;
  }
  return null;
}

// ─── CLASSIFY MESSAGE ─────────────────────────────────────────────────────────
async function classifyMessage({
  content,
  source,
  senderName,
  hasFiles = false,
  hasLinks = false,
  groupName = null,
  conversationContext = "",
  mediaUrls = []
}) {
  const lowerContent = (content || '').toLowerCase().trim();
  const isLikelyApproval = lowerContent.length < 30 && !lowerContent.includes('http');

  if (!isLikelyApproval) {
    const cached = getCachedAnalysis(content);
    if (cached) return cached;
  }

  const groupContext = groupName ? `Group / Channel: ${groupName}` : "";

  const systemPrompt = `You are OpenClaw, the routing engine for AppsRow (Webflow agency).
Analyze the message from ${source.toUpperCase()} and return JSON:
{
  "should_forward": boolean,
  "priority": "high" | "medium" | "low",
  "category": "change_request" | "design_feedback" | "project_update" | "client_approval" | "technical_issue" | "file_share" | "link_share" | "deadline" | "follow_up" | "new_project" | "feedback" | "urgent" | "meeting_request" | "greeting" | "payment" | "invoice" | "scheduling" | "general_chat" | "irrelevant",
  "reason": "short sentence explanation",
  "tasks": ["Extracted task 1", "Extracted task 2"],
  "summary": "A concise summary of ONLY the actionable parts",
  "files": [],
  "links": []
}

STRICT SCOPE — forwarding is ONLY for:
A) Concrete **work tasks** (Webflow / site / design / dev / content that requires the team to do something), OR
B) **Client approval** of a specific deliverable, design, or milestone already discussed.

NEVER set should_forward true for:
- Meetings, calls, scheduling, calendar invites, "let's sync", availability, Zoom/Teams/Google Meet links as the main point
- Invoices, payments, billing, quotes, POs, money discussions
- General chat, small talk, greetings-only, thanks-only, social conversation
- News, jokes, unrelated topics

CLIENT APPROVAL: "ok", "👍", "approved", "looks good" → should_forward true ONLY when clearly approving **project work** (design, page, build, milestone). If ambiguous or general assent with no work context → should_forward false, category "general_chat".

CRITICAL: A message about meeting/call/scheduling must ALWAYS be should_forward=false, even if it looks actionable.

VISION: If images show a UI bug or design feedback, that is a task. If decorative or irrelevant, do not forward.

If nothing qualifies, set should_forward false and category "irrelevant" or "general_chat".`;

  const messages = [
    { role: "system", content: systemPrompt }
  ];

  const userContent = [
    { type: "text", text: `Platform: ${source.toUpperCase()}\nSender: ${senderName}\n${groupContext}\nHas files: ${hasFiles}\nHas links: ${hasLinks}\n${conversationContext ? `Previous context:\n${conversationContext}\n` : ''}Message: "${(content || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\\n/g, ' ')}"` }
  ];

  if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
    mediaUrls.forEach(url => {
      userContent.push({
        type: "image_url",
        image_url: { url }
      });
    });
  }

  messages.push({ role: "user", content: userContent });

  try {
    const res = await Promise.race([
      openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages,
        response_format: { type: "json_object" },
        max_tokens: 800,
        temperature: 0,
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("OpenAI timeout")), 20000)),
    ]);

    const parsed = JSON.parse(res.choices[0]?.message?.content?.trim() || "{}");

    const result = {
      should_forward: parsed.should_forward === true || parsed.should_forward === "true",
      priority: parsed.priority || "medium",
      category: parsed.category || "irrelevant",
      reason: (parsed.reason || "Analysis completed").slice(0, 300),
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : (parsed.task ? [parsed.task] : []),
      summary: parsed.summary || parsed.task || "",
      files: Array.isArray(parsed.files) ? parsed.files : [],
      links: Array.isArray(parsed.links) ? parsed.links : [],
    };

    result.task = result.tasks.length > 0 ? result.tasks.join(", ") : (result.summary || null);

    if (!isLikelyApproval) setCachedAnalysis(content, result);
    return result;
  } catch (error) {
    console.error("❌ OpenClaw classify error:", error.message);
    return {
      should_forward: false,
      priority: "low",
      category: "system",
      reason: `Analysis failed: ${error.message.slice(0, 80)}`,
      task: null,
      tasks: [],
      files: [],
      links: [],
    };
  }
}

// ─── DB HELPERS ───────────────────────────────────────────────────────────────

async function getMappingByTeams(teamsChatId) {
  try {
    const r = await db(`SELECT * FROM channel_mappings WHERE teams_chat_id = $1 AND active = true LIMIT 1`, [teamsChatId]);
    return r.rows[0] || null;
  } catch { return null; }
}

async function getMappingBySlack(slackChannelId, tenantId = null) {
  try {
    if (tenantId) {
      const r = await db(
        `SELECT * FROM channel_mappings 
         WHERE slack_channel_id = $1 AND tenant_id = $2 AND active = true 
         ORDER BY id ASC
         LIMIT 1`,
        [slackChannelId, tenantId]
      );
      if (r.rows[0]) return r.rows[0];
    }
    const r = await db(
      `SELECT * FROM channel_mappings WHERE slack_channel_id = $1 AND active = true ORDER BY id ASC LIMIT 1`,
      [slackChannelId]
    );
    return r.rows[0] || null;
  } catch {
    return null;
  }
}

async function getMappingByWhatsAppGroup(groupName, tenantId = process.env.DEFAULT_TENANT_ID || "tenant-default") {
  try {
    const r = await db(
      `SELECT * FROM channel_mappings 
       WHERE tenant_id = $1 AND TRIM(whatsapp_group_name) = TRIM($2) AND active = true 
       ORDER BY id ASC
       LIMIT 1`,
      [tenantId, groupName?.trim()]
    );
    return r.rows[0] || null;
  } catch { return null; }
}

async function saveTask(source, sender, label, classification) {
  if (!classification.task) return null;
  try {
    const result = await db(
      `INSERT INTO tasks (source, client_name, platform_label, body, links, images, status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW()) RETURNING id`,
      [source, sender, label, classification.task, JSON.stringify(classification.links || []), JSON.stringify(classification.files || [])]
    );
    const taskId = result.rows[0]?.id;
    console.log(`📋 Task saved: "${classification.task}" (id: ${taskId})`);
    return taskId;
  } catch (err) {
    console.error("❌ Failed to save task:", err.message);
    return null;
  }
}

// ─── FIND TEAMS CONVERSATION ──────────────────────────────────────────────────
// Uses channel_mappings + teams_conversations only (no GPT guessing — prevents wrong Teams group).
async function findTeamsConversation(groupName, senderPhone, taskId, content, source, tenantId = process.env.DEFAULT_TENANT_ID || "tenant-default") {
  if (!groupName || String(groupName).startsWith("__")) {
    await logForward({
      source,
      destination: "teams",
      source_channel: groupName || senderPhone,
      dest_channel: "unknown",
      message_preview: content,
      status: "failed",
      error_reason: "missing or unresolved WhatsApp group — set channel_mappings.whatsapp_group_name and/or WHATSAPP_GROUP_JID_MAP",
      task_id: taskId,
    });
    return { conv: null, matchedChatName: null };
  }

  const mapping = await getMappingByWhatsAppGroup(groupName, tenantId);
  if (!mapping) {
    console.log(`❌ No channel_mappings row for WhatsApp group: "${groupName}"`);
    await logForward({
      source,
      destination: "teams",
      source_channel: groupName,
      dest_channel: "unknown",
      message_preview: content,
      status: "failed",
      error_reason: "no channel_mappings match for whatsapp_group_name",
      task_id: taskId,
    });
    return { conv: null, matchedChatName: null };
  }

  console.log(`✅ Mapping found → ${mapping.teams_chat_name} (${mapping.teams_chat_id})`);
  if (!String(mapping.teams_chat_id || "").startsWith("19:")) {
    await logForward({
      source,
      destination: "teams",
      source_channel: groupName,
      dest_channel: mapping.teams_chat_name || "unknown",
      message_preview: content,
      status: "failed",
      error_reason: "mapped teams_chat_id is invalid format",
      task_id: taskId,
    });
    return { conv: null, matchedChatName: mapping.teams_chat_name || null };
  }

  const conv = {
    conversation_id: mapping.teams_chat_id,
    conversation_name: mapping.teams_chat_name || mapping.teams_chat_id,
  };
  return { conv, matchedChatName: mapping.teams_chat_name };
}

// ─── TEAMS → DRAFTS ───────────────────────────────────────────────────────────
async function processTeamsForDrafts({ messageId, messageIds, sender, content, isBatched = false }) {
  try {
    const existing = await db(`SELECT ai_reasoning FROM teams_messages WHERE id = $1`, [messageId]);
    const reason = existing.rows[0]?.ai_reasoning || "";
    if (reason && !reason.includes("failed") && !reason.includes("timeout") && !reason.includes("Skipped")) {
      return { analyzed: false, reason: "already analyzed" };
    }
  } catch { }

  console.log(`🤖 OpenClaw [Teams→Drafts] "${(content || "").slice(0, 60)}" | ${sender}`);

  const rejected = quickReject(content);
  if (rejected) {
    try { await db(`UPDATE teams_messages SET ai_reasoning=$1, priority='low', message_type='greeting' WHERE id = ANY($2)`, [`Skipped: ${rejected}`, messageIds || [messageId]]); } catch { }
    return { analyzed: false, reason: rejected };
  }

  let conversationContext = '';
  try {
    const recent = await db(
      `SELECT sender, body FROM teams_messages 
       WHERE NOT (id = ANY($1))
       ORDER BY timestamp DESC LIMIT 5`,
      [messageIds || [messageId]]
    );
    conversationContext = recent.rows.reverse().map(m => `${m.sender}: ${m.body}`).join('\n');
  } catch { }

  return queueAnalysis(async () => {
    const classification = await classifyMessage({
      content,
      source: "teams",
      senderName: sender,
      hasFiles: false,
      hasLinks: false,
      conversationContext
    });

    console.log(`🤖 [${classification.priority?.toUpperCase()}] [${classification.category}] → ${classification.reason} (Batched: ${isBatched})`);

    try {
      await db(`UPDATE teams_messages SET ai_reasoning=$1, priority=$2, message_type=$3, approval_status='waiting' WHERE id = ANY($4)`,
        [classification.reason, classification.priority, classification.category, messageIds || [messageId]]);

      await logForward({
        source: "teams",
        destination: "teams-drafts",
        source_channel: "Internal Chat",
        dest_channel: "Review Dashboard",
        message_preview: content,
        status: "delivered",
        ai_category: classification.category,
        ai_reason: classification.reason,
        is_batched: isBatched
      });
    } catch (err) {
      console.error("Failed to save Teams analysis:", err.message);
    }
    return { analyzed: true, classification };
  });
}

// ─── TEAMS → SLACK ────────────────────────────────────────────────────────────
export async function processTeamsToSlack({ messageId, messageIds, sender, content, chatId, chatName, files = [], links = [], isBatched = false }) {
  console.log(`🤖 OpenClaw [Teams→Slack] "${(content || "").slice(0, 60)}" | ${sender} | ${chatName}`);

  try {
    const mapping = await getMappingByTeams(chatId);
    if (!mapping || !mapping.slack_channel_id || mapping.slack_channel_id === 'none') {
      console.log(`🤖 OpenClaw ✗ No Slack mapping for Teams chat: ${chatName}`);
      return { forwarded: false, reason: "no slack mapping" };
    }

    const hasFiles = Array.isArray(files) && files.length > 0;
    const hasLinks = Array.isArray(links) && links.length > 0;

    if (!hasFiles && !hasLinks) {
      const rejected = quickReject(content);
      if (rejected) {
        console.log(`🤖 OpenClaw ✗ Quick reject: ${rejected}`);
        return { forwarded: false, reason: rejected };
      }
    }

    let conversationContext = '';
    try {
      const recent = await db(
        `SELECT sender, body FROM teams_messages 
         WHERE source_id = $1 AND NOT (id = ANY($2))
         ORDER BY timestamp DESC LIMIT 5`,
        [chatId, messageIds || [messageId]]
      );
      conversationContext = recent.rows.reverse().map(m => `${m.sender}: ${m.body}`).join('\n');
    } catch { }

    const classification = await classifyMessage({
      content,
      source: "teams",
      senderName: sender,
      hasFiles,
      hasLinks,
      groupName: chatName,
      conversationContext
    });

    const shouldForward =
      classification.should_forward && isForwardEligibleCategory(classification.category);

    try {
      await db(`UPDATE teams_messages SET ai_category=$1, ai_should_forward=$2, ai_priority=$3, ai_reason=$4 WHERE id = ANY($5)`,
        [classification.category, shouldForward, classification.priority, classification.reason, messageIds || [messageId]]);
    } catch { }

    if (!shouldForward) {
      await logForward({
        source: "teams",
        destination: "slack",
        source_channel: chatName,
        dest_channel: mapping.slack_channel_name,
        message_preview: content,
        status: "skipped",
        ai_category: classification.category,
        ai_reason: classification.reason,
        is_batched: isBatched
      });
      return { forwarded: false, reason: classification.reason };
    }

    const cleanContent = classification.summary || classification.task || content;
    let slackText = `*[${mapping.project_name} · Teams]* *${sender}:*\n${cleanContent}`;
    if (hasLinks) slackText += `\n\n🔗 *Links:*\n${links.join("\n")}`;

    try {
      const { sendSlack } = await import("../tools/sendSlack.js");
      await sendSlack(mapping.slack_channel_id, slackText);
      console.log(`✅ OpenClaw forwarded Teams→Slack: ${chatName} → ${mapping.slack_channel_name}`);
      try { await db(`UPDATE teams_messages SET forwarded_to_slack=true, forwarded_to_slack_at=NOW() WHERE id = ANY($1)`, [messageIds || [messageId]]); } catch { }
      await logForward({
        source: "teams",
        destination: "slack",
        source_channel: chatName,
        dest_channel: mapping.slack_channel_name,
        message_preview: cleanContent,
        status: "delivered",
        ai_category: classification.category,
        ai_reason: classification.reason,
        is_batched: isBatched
      });
      return { forwarded: true, channel: mapping.slack_channel_name };
    } catch (err) {
      await logForward({ source: "teams", destination: "slack", source_channel: chatName, dest_channel: mapping.slack_channel_name, message_preview: cleanContent, status: "failed", error_reason: err.message });
      throw err;
    }
  } catch (err) {
    console.error(`❌ OpenClaw Teams→Slack failed:`, err.message);
    return { forwarded: false, reason: err.message };
  }
}

// ─── TEAMS → WHATSAPP ─────────────────────────────────────────────────────────
export async function processTeamsToWhatsApp({ messageId, messageIds, sender, content, chatId, chatName, files = [], links = [], isBatched = false }) {
  console.log(`🤖 OpenClaw [Teams→WhatsApp] "${(content || "").slice(0, 60)}" | ${sender} | ${chatName}`);

  const mapping = await getMappingByTeams(chatId);
  if (!mapping || !mapping.whatsapp_number) {
    console.log(`🤖 OpenClaw ✗ No WhatsApp mapping for Teams chat: ${chatName}`);
    return { forwarded: false, reason: "no whatsapp mapping" };
  }

  const hasFiles = Array.isArray(files) && files.length > 0;
  const hasLinks = Array.isArray(links) && links.length > 0;

  if (!hasFiles && !hasLinks) {
    const rejected = quickReject(content);
    if (rejected) {
      return { forwarded: false, reason: rejected };
    }
  }

  let conversationContext = '';
  try {
    const recent = await db(
      `SELECT sender, body FROM teams_messages 
       WHERE source_id = $1 AND NOT (id = ANY($2))
       ORDER BY timestamp DESC LIMIT 5`,
      [chatId, messageIds || [messageId]]
    );
    conversationContext = recent.rows.reverse().map(m => `${m.sender}: ${m.body}`).join('\n');
  } catch { }

  const classification = await classifyMessage({
    content,
    source: "teams",
    senderName: sender,
    hasFiles,
    hasLinks,
    groupName: chatName,
    conversationContext
  });
  const shouldForward =
    classification.should_forward && isForwardEligibleCategory(classification.category);

  try { await db(`UPDATE teams_messages SET ai_category=$1, ai_should_forward=$2, ai_priority=$3, ai_reason=$4 WHERE id = ANY($5)`, [classification.category, shouldForward, classification.priority, classification.reason, messageIds || [messageId]]); } catch { }

  if (!shouldForward) {
    await logForward({
      source: "teams",
      destination: "whatsapp",
      source_channel: chatName,
      dest_channel: mapping.whatsapp_number,
      message_preview: content,
      status: "skipped",
      ai_category: classification.category,
      ai_reason: classification.reason,
      is_batched: isBatched
    });
    return { forwarded: false, reason: classification.reason };
  }

  const cleanContent = classification.summary || classification.task || content;
  let whatsappText = `📨 *[${mapping.project_name} · Teams]*\n*${sender}:*\n\n${cleanContent}`;
  if (hasLinks) whatsappText += `\n\n🔗 *Links:*\n${links.join("\n")}`;

  try {
    const { sendWhatsApp } = await import("../tools/sendWhatsApp.js");
    const result = await sendWhatsApp(mapping.whatsapp_number, whatsappText);
    if (result.success) {
      console.log(`✅ OpenClaw forwarded Teams→WhatsApp: ${chatName} → ${mapping.whatsapp_number}`);
      try { await db(`UPDATE teams_messages SET forwarded_to_whatsapp=true, forwarded_to_whatsapp_at=NOW() WHERE id=$1`, [messageId]); } catch { }
      await logForward({ source: "teams", destination: "whatsapp", source_channel: chatName, dest_channel: mapping.whatsapp_number, message_preview: cleanContent, status: "delivered", is_batched: isBatched });
      return { forwarded: true, number: mapping.whatsapp_number };
    }
    await logForward({ source: "teams", destination: "whatsapp", source_channel: chatName, dest_channel: mapping.whatsapp_number, message_preview: cleanContent, status: "failed", error_reason: result.error });
    return { forwarded: false, reason: result.error };
  } catch (err) {
    console.error(`❌ OpenClaw Teams→WhatsApp failed:`, err.message);
    await logForward({ source: "teams", destination: "whatsapp", source_channel: chatName, dest_channel: mapping?.whatsapp_number || "unknown", message_preview: cleanContent, status: "failed", error_reason: err.message });
    return { forwarded: false, reason: err.message };
  }
}

// ─── WHATSAPP → TEAMS ─────────────────────────────────────────────────────────
export async function processWhatsAppToTeams({ messageId, sender, content, senderPhone, groupName, mediaUrls: batchMedia = [] }) {
  console.log(`🤖 OpenClaw [WhatsApp→Teams] "${(content || "").slice(0, 60)}" | ${sender} | group: ${groupName}`);

  let tenantId = process.env.DEFAULT_TENANT_ID || "tenant-default";
  try {
    const tr = await db(`SELECT tenant_id FROM whatsapp_messages WHERE id = $1`, [messageId]);
    if (tr.rows[0]?.tenant_id) tenantId = tr.rows[0].tenant_id;
  } catch { }

  const rejected = quickReject(content);
  if (rejected) {
    console.log(`🤖 OpenClaw ✗ Quick reject: ${rejected}`);
    try { await db(`UPDATE whatsapp_messages SET ai_category='greeting', ai_should_forward=false, ai_priority='low', ai_reason=$1 WHERE id=$2`, [`Skipped: ${rejected}`, messageId]); } catch { }
    return { forwarded: false, reason: rejected };
  }

  let mediaUrls = [];
  try {
    const msgRow = await db(`SELECT media_urls FROM whatsapp_messages WHERE id = $1`, [messageId]);
    const raw = msgRow.rows[0]?.media_urls;
    if (raw) {
      mediaUrls = typeof raw === 'string' ? JSON.parse(raw) : raw;
      mediaUrls = (mediaUrls || []).filter(Boolean);
    }
  } catch { }
  if (Array.isArray(batchMedia) && batchMedia.length > 0) {
    mediaUrls = [...new Set([...mediaUrls, ...batchMedia.filter(Boolean)])];
  }

  const hasMedia = mediaUrls.length > 0;

  let conversationContext = '';
  try {
    const recentMessages = await db(
      `SELECT sender, body, direction FROM whatsapp_messages 
       WHERE group_name = $1 AND id != $2
       ORDER BY timestamp DESC LIMIT 20`,
      [groupName, messageId]
    );
    if (recentMessages.rows.length > 0) {
      conversationContext = recentMessages.rows.reverse()
        .map(m => `[${m.direction === 'outbound' ? 'Team' : 'Client'}] ${m.sender}: ${m.body}`)
        .join('\n');
    }
  } catch { }

  const classification = await classifyMessage({
    content,
    source: "whatsapp",
    senderName: sender,
    hasFiles: hasMedia,
    hasLinks: false,
    groupName,
    conversationContext,
    mediaUrls
  });
  const categoryOk = isForwardEligibleCategory(classification.category);
  const blockedByContent = hasBlockedForwardContent(
    content,
    classification.summary,
    classification.tasks || [],
    classification.task
  );
  const shouldForward = classification.should_forward && categoryOk && !blockedByContent;

  try { await db(`UPDATE whatsapp_messages SET ai_category=$1, ai_should_forward=$2, ai_priority=$3, ai_reason=$4 WHERE id=$5`, [classification.category, shouldForward, classification.priority, classification.reason, messageId]); } catch { }

  if (!shouldForward) {
    console.log(
      `🤖 OpenClaw ✗ Not forwarding: ${classification.reason}${!categoryOk ? ` (category: ${classification.category})` : ""}${blockedByContent ? " (blocked content: meeting/payment/scheduling)" : ""}`
    );
    return { forwarded: false, reason: classification.reason };
  }

  if (!classification.task && !hasMedia && classification.category !== "client_approval") {
    console.log(`🤖 OpenClaw ✗ No task extracted and no media — skipping`);
    return { forwarded: false, reason: "no task extracted" };
  }

  let taskId = null;
  if (classification.task && classification.category !== "client_approval") {
    taskId = await saveTask("whatsapp", sender, groupName || senderPhone, classification);
  }

  console.log(`🔍 Looking up mapping for: "${groupName}"`);
  const { conv, matchedChatName } = await findTeamsConversation(groupName, senderPhone, taskId, content, "whatsapp", tenantId);
  if (!conv) return { forwarded: false, reason: "no conversation reference" };
  const expectedConversationId = String(conv.conversation_id || "").trim();

  if (classification.category === "client_approval") {
    try {
      const message = `✅ **Client Approval from ${groupName}**\n─────────────────────────────\n\n${classification.summary || content}`;
      await sendToGroupChat(conv.conversation_id, message);
      if (String(conv.conversation_id || "").trim() !== expectedConversationId) {
        throw new Error(`Routing mismatch: expected ${expectedConversationId}, got ${conv.conversation_id}`);
      }
      await db(`UPDATE whatsapp_messages SET forwarded_to_teams=true, forwarded_at=NOW() WHERE id=$1`, [messageId]);
      console.log(`✅ Approval notification sent: "${groupName}" → "${conv.conversation_name}"`);
      await logForward({ source: "whatsapp", destination: "teams", source_channel: groupName, dest_channel: conv.conversation_name, message_preview: classification.summary || content, status: "delivered" });
      return { forwarded: true, chat: conv.conversation_name };
    } catch (err) {
      console.error(`❌ Approval notification failed:`, err.message);
      await logForward({ source: "whatsapp", destination: "teams", source_channel: groupName, dest_channel: conv.conversation_name, message_preview: classification.summary || content, status: "failed", error_reason: err.message });
      return { forwarded: false, reason: err.message };
    }
  }

  try {
    const { sendTaskCardToTeams } = await import("../services/teamsService.js");
    await sendTaskCardToTeams(conv.conversation_id, {
      task: classification.summary || classification.task || "New media from client",
      description: classification.tasks.length > 1 ? classification.tasks.map(t => `• ${t}`).join('\n') : (classification.summary || content),
      sender,
      groupName,
      files: classification.files || [],
      links: classification.links || [],
      mediaUrls,
    });
    if (String(conv.conversation_id || "").trim() !== expectedConversationId) {
      throw new Error(`Routing mismatch: expected ${expectedConversationId}, got ${conv.conversation_id}`);
    }

    console.log(`✅ Task card sent: "${groupName}" → "${conv.conversation_name || matchedChatName}"`);
    try { await db(`UPDATE whatsapp_messages SET forwarded_to_teams=true, forwarded_at=NOW() WHERE id=$1`, [messageId]); } catch { }
    await logForward({ source: "whatsapp", destination: "teams", source_channel: groupName, dest_channel: conv.conversation_name || matchedChatName, message_preview: classification.summary || content, status: "delivered", task_id: taskId });
    return { forwarded: true, chat: conv.conversation_name || matchedChatName, taskId };
  } catch (err) {
    console.error(`❌ OpenClaw WhatsApp→Teams failed:`, err.message);
    await logForward({ source: "whatsapp", destination: "teams", source_channel: groupName, dest_channel: conv?.conversation_name || matchedChatName || "unknown", message_preview: classification.summary || content, status: "failed", error_reason: err.message, task_id: taskId });
    return { forwarded: false, reason: err.message };
  }
}

// ─── SLACK → TEAMS ────────────────────────────────────────────────────────────
export async function processSlackToTeams({ messageId, messageIds, sender, content, channelId, channelName, files = [], links = [], isBatched = false }) {
  console.log(`🤖 OpenClaw [Slack→Teams] "${(content || "").slice(0, 60)}" | ${sender} | ${channelName}`);
  const allMessageIds = messageIds || [messageId];

  let slackTenantId = process.env.DEFAULT_TENANT_ID || "tenant-default";
  try {
    const tr = await db(`SELECT tenant_id FROM slack_messages WHERE id = $1`, [allMessageIds[0]]);
    if (tr.rows[0]?.tenant_id) slackTenantId = tr.rows[0].tenant_id;
  } catch {}

  const mapping = await getMappingBySlack(channelId, slackTenantId);
  if (!mapping) {
    await logForward({ source: "slack", destination: "teams", source_channel: channelName, dest_channel: "unknown", message_preview: content, status: "failed", error_reason: "no mapping found" });
    return { forwarded: false, reason: "no mapping" };
  }

  const hasFiles = Array.isArray(files) && files.length > 0;
  const hasLinks = Array.isArray(links) && links.length > 0;

  if (!hasFiles) {
    const rejected = quickReject(content);
    if (rejected) return { forwarded: false, reason: rejected };
  }

  let conversationContext = '';
  try {
    const recentMessages = await db(
      `SELECT sender, body FROM slack_messages 
       WHERE channel_id = $1 AND NOT (id = ANY($2))
       ORDER BY timestamp DESC LIMIT 5`,
      [channelId, allMessageIds]
    );
    if (recentMessages.rows.length > 0) {
      conversationContext = recentMessages.rows.reverse().map(m => `${m.sender}: ${m.body}`).join('\n');
    }
  } catch { }

  const classification = await classifyMessage({
    content,
    source: "slack",
    senderName: sender,
    hasFiles,
    hasLinks,
    groupName: channelName,
    conversationContext
  });
  const shouldForward =
    classification.should_forward &&
    isForwardEligibleCategory(classification.category) &&
    !hasBlockedForwardContent(content, classification.summary, classification.tasks || [], classification.task);

  if (!shouldForward) {
    console.log(`🤖 OpenClaw ✗ Not forwarding Slack: ${classification.reason}`);
    await logForward({
      source: "slack",
      destination: "teams",
      source_channel: channelName,
      dest_channel: mapping.teams_chat_name,
      message_preview: content,
      status: "skipped",
      ai_category: classification.category,
      ai_reason: classification.reason,
      is_batched: isBatched
    });
    return { forwarded: false, reason: classification.reason };
  }

  let taskId = null;
  if (classification.task && classification.category !== 'client_approval') {
    taskId = await saveTask("slack", sender, mapping?.project_name || channelName, classification);
  }

  const conv = {
    conversation_id: mapping.teams_chat_id,
    conversation_name: mapping.teams_chat_name || mapping.teams_chat_id,
  };
  if (!conv) {
    await logForward({ source: "slack", destination: "teams", source_channel: channelName, dest_channel: mapping.teams_chat_name, message_preview: content, status: "failed", error_reason: "no conversation reference", task_id: taskId, ai_category: classification.category, ai_reason: classification.reason });
    return { forwarded: false, reason: "no conversation reference" };
  }

  if (classification.category === 'client_approval') {
    try {
      const message = `✅ **Client Approval from #${channelName}**\n─────────────────────────────\n\n${classification.summary || content}`;
      await sendToGroupChat(conv.conversation_id, message);
      try { await db(`UPDATE slack_messages SET forwarded_to_teams=true, forwarded_at=NOW() WHERE id = ANY($1)`, [allMessageIds]); } catch { }
      await logForward({ source: "slack", destination: "teams", source_channel: channelName, dest_channel: conv.conversation_name, message_preview: classification.summary || content, status: "delivered", ai_category: classification.category, ai_reason: classification.reason, is_batched: isBatched });
      return { forwarded: true, chat: conv.conversation_name };
    } catch (err) {
      console.error(`❌ Slack approval notification failed:`, err.message);
      return { forwarded: false, reason: err.message };
    }
  }

  const mediaUrls = files.map(f => f.publicUrl || f.url).filter(url => url && url.startsWith('http'));

  try {
    const { sendTaskCardToTeams } = await import("../services/teamsService.js");
    await sendTaskCardToTeams(conv.conversation_id, {
      task: classification.summary || classification.task || (isBatched ? "Grouped client feedback" : "New request from client"),
      description: classification.tasks.length > 1 ? classification.tasks.map(t => `• ${t}`).join('\n') : (classification.summary || content),
      sender,
      groupName: `${channelName} (Slack)`,
      files: [...files.map(f => f.name).filter(Boolean), ...(classification.files || [])],
      links: [...links, ...(classification.links || [])],
      mediaUrls,
    });

    console.log(`✅ OpenClaw task card sent: ${channelName} → ${conv.conversation_name}`);
    try { await db(`UPDATE slack_messages SET forwarded_to_teams=true, forwarded_at=NOW() WHERE id = ANY($1)`, [allMessageIds]); } catch { }
    await logForward({ source: "slack", destination: "teams", source_channel: channelName, dest_channel: conv.conversation_name, message_preview: classification.summary || content, status: "delivered", task_id: taskId, ai_category: classification.category, ai_reason: classification.reason, is_batched: isBatched, media_urls: mediaUrls });
    return { forwarded: true, chat: conv.conversation_name, taskId };
  } catch (err) {
    console.error(`❌ OpenClaw Slack→Teams failed:`, err.message);
    await logForward({ source: "slack", destination: "teams", source_channel: channelName, dest_channel: conv.conversation_name, message_preview: classification.summary || content, status: "failed", error_reason: err.message, task_id: taskId, ai_category: classification.category, ai_reason: classification.reason });
    return { forwarded: false, reason: err.message };
  }
}

// ─── SLACK → WHATSAPP ─────────────────────────────────────────────────────────
export async function processSlackToWhatsApp({ messageId, sender, content, channelId, channelName, whatsappNumber }) {
  console.log(`🤖 OpenClaw [Slack→WhatsApp] "${(content || "").slice(0, 60)}" | ${sender} | ${channelName}`);

  if (!whatsappNumber) return { forwarded: false, reason: "no whatsapp number" };

  const rejected = quickReject(content);
  if (rejected) return { forwarded: false, reason: rejected };

  const classification = await classifyMessage({
    content,
    source: "slack",
    senderName: sender,
    hasFiles: false,
    hasLinks: false,
    groupName: channelName
  });
  if (!classification.should_forward || !isForwardEligibleCategory(classification.category)) {
    return { forwarded: false, reason: classification.reason };
  }

  const cleanContent = classification.summary || classification.task || content;
  const message = `📨 *From Slack (${channelName})*\n*${sender}:*\n\n${cleanContent}`;
  try {
    const { sendWhatsApp } = await import("../tools/sendWhatsApp.js");
    const result = await sendWhatsApp(whatsappNumber, message);
    if (result.success) {
      try { await db(`UPDATE slack_messages SET forwarded_to_whatsapp=true, forwarded_at=NOW() WHERE id=$1`, [messageId]); } catch { }
      await logForward({ source: "slack", destination: "whatsapp", source_channel: channelName, dest_channel: whatsappNumber, message_preview: cleanContent, status: "delivered" });
      return { forwarded: true, number: whatsappNumber };
    }
    await logForward({ source: "slack", destination: "whatsapp", source_channel: channelName, dest_channel: whatsappNumber, message_preview: cleanContent, status: "failed", error_reason: result.error });
    return { forwarded: false, reason: result.error };
  } catch (err) {
    console.error(`❌ OpenClaw Slack→WhatsApp failed:`, err.message);
    await logForward({ source: "slack", destination: "whatsapp", source_channel: channelName, dest_channel: whatsappNumber, message_preview: cleanContent, status: "failed", error_reason: err.message });
    return { forwarded: false, reason: err.message };
  }
}

const pendingMessages = new Map();

// ─── MAIN ENTRY POINT ─────────────────────────────────────────────────────────
export async function runAgentAnalysis({ source, sender, content, messageId, mediaUrls = [], files = [], links = [] }) {
  console.log(`🤖 OpenClaw analyzing [${source}] from ${sender} (id: ${messageId})`);

  // Teams-chat — skip debouncing
  if (source === "teams-chat") {
    try {
      const r = await db(`SELECT * FROM teams_messages WHERE id=$1`, [messageId]);
      const msg = r.rows[0];
      if (!msg) return;
      let f = [], l = [];
      try { f = JSON.parse(msg.files || "[]"); } catch { }
      try { l = JSON.parse(msg.links || "[]"); } catch { }
      await processTeamsToSlack({ messageId, sender, content, chatId: msg.source_id, chatName: msg.chat_name, files: f, links: l });
      await processTeamsToWhatsApp({ messageId, sender, content, chatId: msg.source_id, chatName: msg.chat_name, files: f, links: l });
    } catch (e) { console.error("Error in teams-chat analysis:", e); }
    return;
  }

  let groupKey = "";
  let metadata = {};

  try {
    if (source === "slack") {
      // FIX: removed 'links' column — it doesn't exist in slack_messages
      const r = await db(`SELECT channel_id, channel_name, files FROM slack_messages WHERE id=$1`, [messageId]);
      if (r.rows[0]) {
        groupKey = `slack:${r.rows[0].channel_id}`;
        metadata = { channelId: r.rows[0].channel_id, channelName: r.rows[0].channel_name, files: r.rows[0].files, links: links };
      }
    } else if (source === "whatsapp") {
      const r = await db(`SELECT group_name, media_urls, sender_phone FROM whatsapp_messages WHERE id=$1`, [messageId]);
      if (r.rows[0]) {
        groupKey = `whatsapp:${r.rows[0].group_name || sender}`;
        metadata = {
          groupName: r.rows[0].group_name,
          mediaUrls: r.rows[0].media_urls,
          senderPhone: r.rows[0].sender_phone,
        };
      }
    } else if (source === "teams") {
      const r = await db(`SELECT source_id, chat_name FROM teams_messages WHERE id=$1`, [messageId]);
      if (r.rows[0]) {
        groupKey = `teams:${r.rows[0].source_id}`;
        metadata = { chatId: r.rows[0].source_id, chatName: r.rows[0].chat_name };
      }
    }
  } catch (e) { console.error("Metadata fetch error:", e); }

  if (!groupKey) groupKey = `${source}:${sender}`;

  if (!pendingMessages.has(groupKey)) {
    pendingMessages.set(groupKey, { timer: null, msgs: [] });
  }

  const queue = pendingMessages.get(groupKey);
  queue.msgs.push({ messageId, sender, content, metadata, mediaUrls, files, links });

  if (queue.timer) clearTimeout(queue.timer);
  queue.timer = setTimeout(async () => {
    pendingMessages.delete(groupKey);
    const msgs = queue.msgs;
    const msgIds = msgs.map(m => m.messageId);
    const lastMsg = msgs[msgs.length - 1];

    const uniqueSenders = [...new Set(msgs.map(m => m.sender))];
    const combinedSender = uniqueSenders.length > 1 ? "Multiple Users" : uniqueSenders[0];
    const combinedContent = uniqueSenders.length > 1
      ? msgs.map(m => `[${m.sender}] ${m.content}`).join('\n').trim()
      : msgs.map(m => m.content).filter(Boolean).join('\n\n').trim();

    const combinedFiles = msgs.flatMap(m => {
      try { return typeof m.files === 'string' ? JSON.parse(m.files || "[]") : (m.files || []); } catch { return []; }
    });
    const combinedLinks = msgs.flatMap(m => {
      try { return typeof m.links === 'string' ? JSON.parse(m.links || "[]") : (m.links || []); } catch { return []; }
    });
    const combinedMedia = msgs.flatMap(m => {
      try { return typeof m.mediaUrls === 'string' ? JSON.parse(m.mediaUrls || "[]") : (m.mediaUrls || []); } catch { return []; }
    });

    try {
      if (source === "slack") {
        await processSlackToTeams({
          messageIds: msgIds,
          sender: combinedSender,
          content: combinedContent,
          channelId: lastMsg.metadata.channelId,
          channelName: lastMsg.metadata.channelName,
          files: combinedFiles,
          links: combinedLinks,
          isBatched: msgs.length > 1
        });
      } else if (source === "whatsapp") {
        await processWhatsAppToTeams({
          messageId: lastMsg.messageId,
          sender: combinedSender,
          content: combinedContent,
          senderPhone: lastMsg.metadata.senderPhone,
          groupName: lastMsg.metadata.groupName,
          mediaUrls: combinedMedia,
        });
      } else if (source === "teams") {
        await processTeamsForDrafts({
          messageId: lastMsg.messageId,
          messageIds: msgIds,
          sender: combinedSender,
          content: combinedContent,
          isBatched: msgs.length > 1
        });
      }
    } catch (e) {
      console.error(`Error processing debounced ${source} messages:`, e);
    }
  }, 10000);
}