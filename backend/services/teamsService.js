import { BotFrameworkAdapter, MessageFactory } from 'botbuilder';
import conversationStore from './conversationStore.js';
import { getAccessToken } from './graphservice.js';
//teamsService.js
export const adapter = new BotFrameworkAdapter({
  appId: process.env.CLIENT_ID,
  appPassword: process.env.CLIENT_SECRET,
  channelAuthTenant: process.env.TENANT_ID,
});

adapter.onTurnError = async (context, error) => {
  console.error('Bot error:', error);
};

function isRosterError(err) {
  const msg = String(err?.message || err || "");
  const code = String(err?.code || err?.details?.error?.code || "");
  return code === "BotNotInConversationRoster" || msg.includes("not part of the conversation roster");
}

function isLikelyChatId(conversationId = '') {
  const id = String(conversationId || '').trim();
  return id.startsWith('19:') && (id.includes('@thread.v2') || id.includes('@unq.gbl.spaces'));
}

function escapeHtml(text = '') {
  return String(text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildFallbackConversationReference(conversationId) {
  const serviceUrl = String(process.env.TEAMS_SERVICE_URL || 'https://smba.trafficmanager.net/teams/').trim();
  const tenantId = String(process.env.TENANT_ID || '').trim();
  const botId = String(process.env.CLIENT_ID || process.env.MicrosoftAppId || '').trim();
  const botName = String(process.env.BOT_NAME || 'UnifiedHub-Bot').trim();

  if (!serviceUrl || !tenantId || !botId) {
    throw new Error(
      'Teams fallback reference is missing required env vars (TEAMS_SERVICE_URL/TENANT_ID/CLIENT_ID)'
    );
  }

  return {
    bot: { id: botId, name: botName },
    conversation: { id: conversationId, isGroup: true, tenantId },
    serviceUrl,
    channelId: 'msteams',
    locale: 'en-US',
  };
}

async function sendToChatViaGraph(conversationId, message) {
  if (!isLikelyChatId(conversationId)) {
    throw new Error(`Invalid Teams chat id for Graph fallback: ${conversationId}`);
  }
  const token = await getAccessToken();
  const body = escapeHtml(message).replace(/\n/g, '<br/>');
  const resp = await fetch(`https://graph.microsoft.com/v1.0/chats/${encodeURIComponent(conversationId)}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      body: { contentType: 'html', content: body },
    }),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) {
    throw new Error(`Graph chat send failed (${resp.status}): ${JSON.stringify(data)}`);
  }
  return { activityId: data?.id || null };
}

export async function sendToGroupChat(conversationId, message, options = {}) {
  const tenantId = options?.tenantId || null;
  const ref = await conversationStore.getById(conversationId, tenantId);
  let conversationReference;
  let conversationName = conversationId;
  let resolvedConversationId = conversationId;

  if (!ref) {
    console.warn(`⚠️ Conversation ref missing for ${conversationId}; using proactive fallback reference`);
    conversationReference = buildFallbackConversationReference(conversationId);
  } else {
    conversationName = ref.conversation_name || conversationId;
    resolvedConversationId = ref.conversation_id || conversationId;
    conversationReference = {
      bot: { id: ref.bot_id, name: ref.bot_name },
      conversation: { id: ref.conversation_id, isGroup: true, tenantId: ref.tenant_id },
      serviceUrl: ref.service_url,
      channelId: 'msteams',
      locale: 'en-US',
    };
  }

  console.log(`📤 Sending to: ${conversationName} (${conversationId})`);

  let activityId = null;
  try {
    await adapter.continueConversation(conversationReference, async (context) => {
      const sent = await context.sendActivity(MessageFactory.text(message));
      activityId = sent?.id || null;
    });
  } catch (err) {
    if (isRosterError(err)) {
      throw new Error(`Bot is not in Teams chat roster: ${resolvedConversationId}`);
    }
    throw err;
  }

  if (!activityId) {
    throw new Error(`Teams send failed (no activity id): ${resolvedConversationId}`);
  }

  console.log(`✅ Message sent to: ${conversationName}`);
  return { activityId };
}

export async function getAllGroupChats(tenantId = null) {
  return await conversationStore.getAll(tenantId);
}

export async function sendImageToGroupChat(conversationId, imageUrl, caption, options = {}) {
  const tenantId = options?.tenantId || null;
  const ref = await conversationStore.getById(conversationId, tenantId);
  const resolvedConversationId = ref?.conversation_id || conversationId;
  const resolvedConversationName = ref?.conversation_name || conversationId;
  const conversationReference = ref
    ? {
        bot: { id: ref.bot_id, name: ref.bot_name },
        conversation: { id: ref.conversation_id, isGroup: true, tenantId: ref.tenant_id },
        serviceUrl: ref.service_url,
        channelId: 'msteams',
        locale: 'en-US',
      }
    : buildFallbackConversationReference(conversationId);
  if (!ref) {
    console.warn(`⚠️ Conversation ref missing for ${conversationId}; using proactive fallback reference for image send`);
  }

  const filename = imageUrl.split('?')[0].split('/').pop() || 'image.jpg';
  let publicUrl = imageUrl;
  let contentType = 'image/jpeg';

  try {
    console.log(`📥 Downloading image for Supabase upload: ${imageUrl}`);
    const fetchHeaders = {};
    try {
      const host = new URL(imageUrl).hostname.toLowerCase();
      if (host.endsWith("slack.com")) {
        fetchHeaders.Authorization = `Bearer ${process.env.SLACK_BOT_TOKEN}`;
      }
    } catch {}
    const response = await fetch(imageUrl, { headers: fetchHeaders });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const buffer = Buffer.from(await response.arrayBuffer());

    const ct = response.headers.get('content-type');
    if (ct && ct.startsWith('image/')) {
      contentType = ct.split(';')[0];
    } else {
      const ext = filename.split('.').pop()?.toLowerCase();
      contentType = ext === 'png' ? 'image/png'
        : ext === 'gif' ? 'image/gif'
        : ext === 'webp' ? 'image/webp'
        : 'image/jpeg';
    }

    const { uploadImageBuffer } = await import('./storageService.js');
    const uploaded = await uploadImageBuffer(buffer, filename, contentType);
    if (uploaded) {
      publicUrl = uploaded;
      console.log(`✅ Uploaded to Supabase: ${publicUrl}`);
    } else {
      console.warn(`⚠️ Supabase upload failed, using original URL`);
    }
  } catch (err) {
    console.error(`❌ Image prep failed, using original URL: ${err.message}`);
  }

  let sentActivityId = null;
  try {
    await adapter.continueConversation(conversationReference, async (context) => {
      const sent = await context.sendActivity(MessageFactory.attachment({
        contentType,
        contentUrl: publicUrl,
        name: filename,
      }));
      sentActivityId = sent?.id || null;
    });
  } catch (err) {
    if (isRosterError(err)) {
      throw new Error(`Bot is not in Teams chat roster: ${resolvedConversationId}`);
    }
    throw err;
  }

  if (!sentActivityId) {
    throw new Error(`Teams image send failed (no activity id): ${resolvedConversationId}`);
  }

  console.log(`✅ Image sent to: ${resolvedConversationName}`);
}

export async function sendImageToTeams(conv, senderName, imageName, imageUrl, mimeType) {
  const conversationReference = {
    bot: { id: conv.bot_id },
    conversation: { id: conv.conversation_id },
    serviceUrl: conv.service_url,
    channelId: 'msteams',
  };

  await adapter.continueConversation(conversationReference, async (turnContext) => {
    await turnContext.sendActivity({
      type: 'message',
      text: `📸 *${senderName}* shared an image from Slack:`,
      attachments: [
        { contentType: mimeType, contentUrl: imageUrl, name: imageName },
      ],
    });
  });

  console.log(`✅ Slack image forwarded to Teams conversation: ${conv.conversation_id}`);
}

// ─── ADD THIS FUNCTION TO teamsService.js ────────────────────────────────────

export async function sendTaskCardToTeams(conversationId, { task, description, sender, groupName, files = [], links = [], mediaUrls = [], mediaInsights = [], tenantId = null }) {  const ref = await conversationStore.getById(conversationId, tenantId);
  const resolvedConversationId = ref?.conversation_id || conversationId;
  const resolvedConversationName = ref?.conversation_name || conversationId;
  const conversationReference = ref
    ? {
        bot: { id: ref.bot_id, name: ref.bot_name },
        conversation: { id: ref.conversation_id, isGroup: true, tenantId: ref.tenant_id },
        serviceUrl: ref.service_url,
        channelId: 'msteams',
        locale: 'en-US',
      }
    : buildFallbackConversationReference(conversationId);
  if (!ref) {
    console.warn(`⚠️ Conversation ref missing for ${conversationId}; using proactive fallback reference for task card`);
  }

  // ── Build task card text ──────────────────────────────────────────────────
  const normalizeBulletLines = (value = '') =>
    String(value || '')
      .split(/\n+|(?=•\s)|(?=-\s)/g)
      .map((line) => line.replace(/^[•-]\s*/, '').trim())
      .filter(Boolean);

  const uniqueBullets = (values = []) => {
    const seen = new Set();
    return values.filter((value) => {
      const key = String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const insightBullets = uniqueBullets(mediaInsights.map((item) => String(item || '').replace(/^🖼️\s*/, '').trim()));
  const detailBullets = uniqueBullets(
    normalizeBulletLines(description).map((item) => String(item || '').replace(/^🖼️\s*/, '').trim())
  ).filter((item) => {
    const normalized = String(item || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return !insightBullets.some((insight) => insight.replace(/\s+/g, ' ').trim().toLowerCase() === normalized);
  });
  const fileBullets = uniqueBullets(files);
  const linkBullets = uniqueBullets(links);

  const lines = [
    `📌 **New Task from ${groupName}**`,
    ``,
    `─────────────────────`,
    ``,
    `**Task :**`,
    `• ${task}`,
  ];
  const normalizedTask = String(task || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const normalizedDescription = String(description || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const shouldShowDescription = !!description && normalizedDescription && normalizedDescription !== normalizedTask;
  if (shouldShowDescription) {
    lines.push(``);
    lines.push(`**Details :**`);
    detailBullets.forEach((item) => lines.push(`• ${item}`));
    lines.push(`<br>`);
  }
  if (insightBullets.length > 0) {
    lines.push(``);
    lines.push(`🖼️ **Media Insights:**`);
    insightBullets.forEach((m) => lines.push(`• ${m}`));
  }

  if (fileBullets.length > 0) {
    lines.push(``);
    lines.push(`📎 **Files**`);
    fileBullets.forEach((file) => lines.push(`• ${file}`));
  }
  if (linkBullets.length > 0) {
    lines.push(``);
    lines.push(`🔗 Links:`);
    linkBullets.forEach((l) => lines.push(`• ${l}`));
  }

  let cardActivityId = null;
  try {
    await adapter.continueConversation(conversationReference, async (context) => {
      const sent = await context.sendActivity(MessageFactory.text(lines.join('\n')));
      cardActivityId = sent?.id || null;
    });
  } catch (err) {
    if (isRosterError(err)) {
      throw new Error(`Bot is not in Teams chat roster: ${resolvedConversationId}`);
    }
    throw err;
  }
  if (!cardActivityId) {
    throw new Error(`Teams task card send failed (no activity id): ${resolvedConversationId}`);
  }

  console.log(`✅ Task card sent to: ${resolvedConversationName}`);

  // ── Step 2: Send each image as attachment ─────────────────────────────────
  for (const imageUrl of mediaUrls) {
    if (!imageUrl || !imageUrl.startsWith('http')) continue;

    try {
      const filename = imageUrl.split('/').pop() || 'image.jpg';
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = Buffer.from(await response.arrayBuffer());

      const ct = response.headers.get('content-type') || '';
      const contentType = ct.startsWith('image/') ? ct.split(';')[0] : 'image/jpeg';

      // Upload to Supabase so Teams can access it
      let publicUrl = imageUrl;
      try {
        const { uploadImageBuffer } = await import('./storageService.js');
        const uploaded = await uploadImageBuffer(buffer, filename, contentType);
        if (uploaded) {
          publicUrl = uploaded;
          console.log(`✅ Image uploaded to Supabase: ${publicUrl}`);
        }
      } catch (uploadErr) {
        console.warn(`⚠️ Supabase upload failed, using original URL: ${uploadErr.message}`);
      }

      let imageActivityId = null;
      await adapter.continueConversation(conversationReference, async (context) => {
        const sent = await context.sendActivity(MessageFactory.attachment({
          contentType,
          contentUrl: publicUrl,
          name: filename,
        }));
        imageActivityId = sent?.id || null;
      });

      if (!imageActivityId) {
        throw new Error(`Teams image send failed (no activity id): ${resolvedConversationId}`);
      }

      console.log(`✅ Image sent: ${filename}`);
    } catch (err) {
      console.error(`❌ Failed to send image ${imageUrl}: ${err.message}`);
    }
  }
}