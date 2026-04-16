import express from "express";
import { runAgentAnalysis } from "../agent/openclawAgent.js";
import { getAccessToken } from "../services/graphservice.js";
import { query as db } from "../db/index.js";
import { uploadTeamsFileToSupabase } from "../services/storageService.js";
//teamsWebhook.js is for handling incoming messages and notifications from Microsoft Graph, while teamsRoutes.js is for handling outgoing messages and group chat management, and teamsApiRoutes.js is for handling API requests related to Teams messages, stats, and forwarding to WhatsApp.
const router = express.Router();

const MONITORED_CHAT_IDS = (process.env.MONITORED_CHAT_IDS || "").split(",").map(id => id.trim()).filter(Boolean);
const STRICT_TEAMS_CHAT_FILTER = String(process.env.STRICT_TEAMS_CHAT_FILTER || "true").toLowerCase() !== "false";
const TEAMS_FILTER_BY_MAPPING = String(process.env.TEAMS_FILTER_BY_MAPPING || "true").toLowerCase() !== "false";

// Bot names to ignore — messages sent by these are our own forwarded messages
const BOT_NAMES = ["UnifiedHub-Bot", "unifiedhub-bot", "OpenClaw", "openclaw"];
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "tenant-default";
const TEAMS_OUTBOUND_DISABLED = String(process.env.DISABLE_TEAMS_TO_OTHER_FORWARDING || 'true').toLowerCase() !== 'false';
const GRAPH_WEBHOOK_CLIENT_STATE = String(process.env.GRAPH_WEBHOOK_CLIENT_STATE || '').trim();

async function getAllowedTeamsChatIds(tenantId = DEFAULT_TENANT_ID) {
  const ids = new Set();
  if (!TEAMS_FILTER_BY_MAPPING) {
    MONITORED_CHAT_IDS.forEach((id) => ids.add(id));
    return ids;
  }
  try {
    const mapped = await db(
      `SELECT teams_chat_id
       FROM channel_mappings
       WHERE tenant_id = $1
         AND active = true
         AND teams_chat_id IS NOT NULL
         AND teams_chat_id != ''
         AND (
           (whatsapp_group_name IS NOT NULL AND whatsapp_group_name != '')
           OR (
             slack_channel_id IS NOT NULL
             AND slack_channel_id != ''
             AND LOWER(slack_channel_id) != 'none'
           )
         )`,
      [tenantId]
    );
    for (const row of mapped.rows) {
      const id = String(row.teams_chat_id || "").trim();
      if (id) ids.add(id);
    }
  } catch (err) {
    console.warn(`⚠️ Failed to load mapped Teams chat ids: ${err.message}`);
  }
  if (ids.size === 0 && MONITORED_CHAT_IDS.length > 0) {
    console.warn("⚠️ No active mapped Teams chats found; falling back to MONITORED_CHAT_IDS");
    MONITORED_CHAT_IDS.forEach((id) => ids.add(id));
  }
  return ids;
}

// ─── GET: Handle Microsoft validation token ───────────────────────────────────
router.get("/webhook", (req, res) => {
  if (req.query.validationToken) {
    console.log("✅ Webhook validated (GET)");
    return res.status(200).type("text/plain").send(req.query.validationToken);
  }
  return res.status(200).send("Webhook endpoint is running");
});

// ─── POST: Handle incoming notifications ─────────────────────────────────────
router.post("/webhook", async (req, res) => {
  if (req.query.validationToken) {
    console.log("✅ Webhook validated (POST)");
    return res.status(200).type("text/plain").send(req.query.validationToken);
  }

  const notifications = req.body?.value || [];
  console.log(`📨 Received ${notifications.length} notification(s)`);

  if (GRAPH_WEBHOOK_CLIENT_STATE) {
    const invalid = notifications.some((notification) => notification?.clientState !== GRAPH_WEBHOOK_CLIENT_STATE);
    if (invalid) {
      console.warn("⛔ Rejected Teams webhook with invalid clientState");
      return res.sendStatus(403);
    }
  }

  res.sendStatus(202);
  const tenantId = req.tenantId || DEFAULT_TENANT_ID;
  const allowedChatIds = await getAllowedTeamsChatIds(tenantId);
  if (STRICT_TEAMS_CHAT_FILTER && allowedChatIds.size === 0) {
    console.warn("⛔ Strict Teams filter enabled and no allowed chat ids configured. Skipping all incoming Teams messages.");
  }

  for (const notification of notifications) {
    const resource = notification.resource;
    const changeType = notification.changeType;
    console.log(`📌 Resource: ${resource} | changeType: ${changeType}`);

    if (changeType && changeType !== "created") {
      console.log(`⏭️ Skipping changeType: ${changeType}`);
      continue;
    }

    try {
      const token = await getAccessToken();
      const response = await fetch(
        `https://graph.microsoft.com/v1.0/${resource}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const message = await response.json();

      const sender = message.from?.user?.displayName || "Unknown";
      const body = message.body?.content || "";
      const timestamp = message.createdDateTime;
      const messageType = message.messageType;
      const graphMessageId = message.id;

      // ─── Skip bot's own forwarded messages ────────────────────────────────
        const isBot = (message.from?.application !== null && message.from?.application !== undefined) ||
        BOT_NAMES.some(n => sender.toLowerCase().includes(n.toLowerCase())) ||
        body.includes("Slack → Teams From:") ||
        body.includes("WhatsApp → Teams") ||
        body.includes("📨 WhatsApp → Teams");

      if (isBot) {
        console.log(`🤖 Skipping bot message from: ${sender}`);
        continue;
      }

      const ALLOWED_TYPES = ["message", "unknownFutureValue", undefined];
      if (!ALLOWED_TYPES.includes(messageType)) {
        console.log(`⏭️ Skipping type: ${messageType}`);
        continue;
      }

      // Helper to clean HTML while preserving structure and decoding entities
      const cleanHtml = (html) => {
        if (!html) return "";
        return html
          .replace(/<br\s*\/?>/gi, "\n")
          .replace(/<\/p>/gi, "\n")
          .replace(/<[^>]*>/g, "")
          .replace(/&nbsp;/g, " ")
          .replace(/&amp;/g, "&")
          .replace(/&lt;/g, "<")
          .replace(/&gt;/g, ">")
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .trim();
      };
      
      const cleanText = cleanHtml(body);
      const normalizedText = cleanText.toLowerCase().replace(/\s+/g, " ").trim();
      const replyToId = message.replyToId || null;
      const isDoneReply = !!replyToId && /^done[.! ]*$/i.test(cleanText);
      const match = resource.match(/chats\(['"]?(19:[^'")\s]+)['"]?\)/);
      const sourceId = match ? match[1] : resource;
      let chatName = "Group Chat";
      let files = [];

      // Handle "done" replies first, even if chat is not in allowed chat ids.
      if (isDoneReply) {
        try {
          const doneBy = sender || "unknown";
          const updated = await db(
            `UPDATE tasks
             SET status = 'done',
                 completed_at = NOW(),
                 completed_by = $3
             WHERE tenant_id = $1
               AND teams_activity_id = $2
               AND status <> 'done'
             RETURNING id`,
            [tenantId, replyToId, doneBy]
          );
          if (updated.rows.length > 0) {
            console.log(`✅ Task marked done via Teams webhook replyToId=${replyToId} taskId=${updated.rows[0].id}`);
          } else {
            console.log(`ℹ️ Done reply received but no pending task matched replyToId=${replyToId}`);
          }
        } catch (markErr) {
          console.error(`❌ Failed to mark done from Teams webhook: ${markErr.message}`);
        }
        continue;
      }

      // One-way mode: ignore Teams-origin manual routing commands.
      if (TEAMS_OUTBOUND_DISABLED && (normalizedText.startsWith("#slack") || normalizedText.startsWith("#wa"))) {
        console.log(`⏭️ Ignoring Teams outbound command in one-way mode: ${cleanText}`);
        continue;
      }

      // ✅ Only process chat messages, skip channels
      const isChat = resource.includes("chats(") || resource.includes("/chats/") || resource.startsWith("chats");
      if (!isChat) {
        console.log(`⏭️ Skipping channel message`);
        continue;
      }
      
      console.log(`📨 Received notification for message from ${sender} in chat ${sourceId}`);

      // ✅ Strict chat allowlist check (MONITORED_CHAT_IDS + active channel_mappings.teams_chat_id)
      if (STRICT_TEAMS_CHAT_FILTER && !allowedChatIds.has(sourceId)) {
        console.log(`⛔ Skipping unapproved Teams chat: ${sourceId}`);
        continue;
      }
      if (allowedChatIds.size > 0) {
        console.log(`✅ Allowed Teams chat matched: ${sourceId}`);
      }

      // ─── Extract files from attachments ──────────────────────────────────
      files = (message.attachments || [])
        .filter(a =>
          a.contentType === "reference" ||
          a.contentType?.includes("image") ||
          a.contentType?.includes("video") ||
          a.contentType?.includes("application")
        )
        .map(a => ({
          name: a.name || "attachment",
          url: a.contentUrl || a.content?.url || a.url,
          contentType: a.contentType
        }))
        .filter(f => f.url);

      for (const file of files) {
        try {
          const publicUrl = await uploadTeamsFileToSupabase(
            file.url,
            file.name || 'attachment',
            sourceId,
            graphMessageId,
            token
          );
          if (publicUrl) {
            file.publicUrl = publicUrl;
          }
        } catch (uploadErr) {
          console.warn(`⚠️ Teams attachment upload skipped for ${file.name}: ${uploadErr.message}`);
        }
      }

      // ─── Fetch inline hosted content images ──────────────────────────────
      try {
        const hostedRes = await fetch(
          `https://graph.microsoft.com/v1.0/chats/${sourceId}/messages/${graphMessageId}/hostedContents`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const hostedData = await hostedRes.json();
        const hostedItems = hostedData.value || [];
        console.log(`🖼️ Hosted contents: ${hostedItems.length}`);
        for (const item of hostedItems) {
          const graphUrl = `https://graph.microsoft.com/v1.0/chats/${sourceId}/messages/${graphMessageId}/hostedContents/${item.id}/$value`;
          let publicUrl = null;
          try {
            publicUrl = await uploadTeamsFileToSupabase(
              graphUrl,
              `image_${item.id}.jpg`,
              sourceId,
              graphMessageId,
              token
            );
          } catch (hostedUploadErr) {
            console.warn(`⚠️ Hosted content upload skipped for ${item.id}: ${hostedUploadErr.message}`);
          }
          files.push({
            name: `image_${item.id}.jpg`,
            url: graphUrl,
            publicUrl,
            contentType: item.contentType || 'image/jpeg',
            hostedContentId: item.id
          });
        }
      } catch (e) {
        console.warn(`⚠️ Hosted content fetch failed: ${e.message}`);
      }

      // ─── Skip only if both text and files are empty ───────────────────────
      if (!cleanText && files.length === 0) {
        console.log("⏭️ Skipping empty message");
        continue;
      }

      // ✅ Duplicate check
      const dupCheck = await db(
        `SELECT id FROM teams_messages 
         WHERE tenant_id = $1
           AND (
             message_id = $2 
             OR (sender = $3 AND body = $4 AND ABS(EXTRACT(EPOCH FROM (timestamp - $5::timestamptz))) < 10)
           )
         LIMIT 1`,
        [tenantId, graphMessageId, sender, body, timestamp]
      );
      if (dupCheck.rows.length > 0) {
        console.log(`⏭️ Duplicate skipped: ${graphMessageId}`);
        continue;
      }

      // ✅ Get chat name
      chatName = "Group Chat";
      try {
        const chatRes = await fetch(
          `https://graph.microsoft.com/v1.0/chats/${sourceId}?$select=topic,chatType`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const chatData = await chatRes.json();
        if (chatData.topic) {
          chatName = chatData.topic;
        } else {
          const memberRes = await fetch(
            `https://graph.microsoft.com/v1.0/chats/${sourceId}/members`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const memberData = await memberRes.json();
          const names = (memberData.value || [])
            .map(m => m.displayName)
            .filter(n => n)
            .slice(0, 4)
            .join(", ");
          chatName = names || "Group Chat";
        }
      } catch (e) {
        chatName = "Group Chat";
      }

      // ✅ Extract links
      const linkRegex = /https?:\/\/[^\s<>"]+/g;
      const rawLinks = (body.match(linkRegex) || []).filter(l =>
        !l.includes('graph.microsoft.com') &&
        !l.includes('sharepoint.com') &&
        !l.includes('teams.microsoft.com')
      );
      
      // Decode entities in links (important for &amp; in URLs)
      const links = [...new Set(rawLinks.map(l => l.replace(/&amp;/g, "&")))];

      if (files.length > 0) {
        console.log(`📎 Found ${files.length} file(s): ${files.map(f => f.name).join(", ")}`);
      }

      // Check if message should be ignored (e.g. "please ignore", "ignore this")
      const lowerBody = cleanText.toLowerCase();
      const isIgnored = lowerBody.includes("please ignore") || 
                        lowerBody.includes("ignore this") || 
                        lowerBody.includes("ignore these task");

      let insertResult;
      try {
        insertResult = await db(
          `INSERT INTO teams_messages 
            (tenant_id, message_id, sender, body, timestamp, message_type, files, links, source_id, source_type, chat_name, approval_status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
           RETURNING id`,
          [
            tenantId, graphMessageId, sender, body, timestamp, messageType,
            JSON.stringify(files), JSON.stringify(links),
            sourceId, "groupChat", chatName,
            isIgnored ? 'ignored' : 'waiting'
          ]
        );
      } catch (insertErr) {
        if (insertErr?.code === '23505') {
          console.log(`⏭️ Duplicate skipped after insert conflict: ${graphMessageId}`);
          continue;
        }
        throw insertErr;
      }

      const savedId = insertResult.rows[0]?.id;
      if (!savedId) {
        console.log(`⏭️ Duplicate skipped after upsert race: ${graphMessageId}`);
        continue;
      }
      console.log(`💾 Saved message from ${sender} (id: ${savedId}): "${cleanText.slice(0, 60)}" ${isIgnored ? '(AUTO-IGNORED)' : ''}`);

      // ✅ Run OpenClaw analysis for text and image-only messages
      if (!isIgnored && ((cleanText && cleanText.length > 0) || files.length > 0)) {
        const mediaUrls = files
          .map((f) => f.publicUrl || f.url)
          .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));
        runAgentAnalysis({
          source: "teams",
          sender,
          content: cleanText || '[Image-only message]',
          messageId: savedId,
          files,
          mediaUrls,
        }).catch(err => console.error("OpenClaw Teams analysis error:", err.message));
      }

      // One-way mode: never auto-forward Teams-origin files/messages to other platforms.
      if (!TEAMS_OUTBOUND_DISABLED && files.length > 0) {
        const { forwardTeamsFilesToWhatsApp } = await import('../services/imageForwardService.js');
        forwardTeamsFilesToWhatsApp(savedId, files, sender, cleanText)
          .catch(err => console.error('Image forward error:', err.message));
      }

    } catch (err) {
      console.error("❌ Error processing notification:", err.message);
    }
  }
});

router.post("/teams", async (req, res) => {
  try {
    const { source, sender, content } = req.body;
    const result = await runAgentAnalysis({ source: source || "teams", sender, content });
    res.status(201).json(result);
  } catch (error) {
    console.error("Teams Webhook Error:", error);
    res.status(500).json({ error: "Agent processing failed", details: error.message });
  }
});

export default router;