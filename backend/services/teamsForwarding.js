import { TEAMS_GROUPS } from '../config/teamsGroups.js';
import { query as db } from '../db/index.js';
import { sendToGroupChat, sendImageToGroupChat } from './teamsService.js';
//teamsForwarding.js - main logic for forwarding messages from WhatsApp (and other sources) to Microsoft Teams, with support for multiple delivery methods and error handling
/**
 * Forward a message to Microsoft Teams
 * @param {Object} options - Forwarding options
 * @param {string} options.groupId - Teams group/chat ID
 * @param {string} options.content - Message content to forward
 * @param {string} options.originalSender - Original sender name
 * @param {string} options.source - Source platform (WhatsApp, Slack, etc.)
 * @param {string} options.sourceGroup - Source group/channel name
 * @returns {Promise<{success: boolean, error?: string, messageId?: string, method?: string}>}
 */
export async function forwardToTeams({ groupId, content, originalSender, source, sourceGroup, mediaUrls = [] }) {
  const safeSource = source || 'Unknown';
  const safeSender = originalSender || 'Unknown';
  const safeSourceGroup = sourceGroup || 'Unknown';
  const text = (content || '').trim();

  if (!groupId) {
    return { success: false, error: 'Missing Teams groupId' };
  }

  if (!text) {
    return { success: false, error: 'Cannot forward empty message' };
  }

  const formattedMessage = `UnifiedHub\nFrom: ${safeSender} (${safeSource}${safeSourceGroup ? ` - ${safeSourceGroup}` : ''})\n\n${text}`;

  // Primary path: Bot Framework proactive message to the selected Teams group/chat
  try {
    console.log(`[WhatsApp->Teams] Bot Framework send to ${groupId}`);
    await sendToGroupChat(groupId, formattedMessage);

      // ── Forward images ──────────────────────────────────────────────────────
      for (const imageUrl of mediaUrls) {
        if (!imageUrl) continue;
          try {
            await sendImageToGroupChat(groupId, imageUrl, `From ${safeSender}`);
              console.log(`✅ Image forwarded to Teams: ${imageUrl}`);
            } catch (imgErr) {
            console.warn(`⚠️ Image forward failed: ${imgErr.message}`);
          }
        }

        return {
        success: true,
        method: 'bot_framework',
        messageId: `bot-${Date.now()}`
    };
  } catch (botError) {
    console.warn(`[WhatsApp->Teams] Bot Framework failed for ${groupId}: ${botError.message}`);

    // Optional fallback path (disabled by default).
    // This can mask "sent to wrong group" issues if your flow ignores groupId.
    const allowWebhookFallback = String(process.env.ALLOW_TEAMS_WEBHOOK_FALLBACK || '').toLowerCase() === 'true';
    if (!allowWebhookFallback) {
      return {
        success: false,
        error: `Bot delivery failed: ${botError.message}. Webhook fallback is disabled.`
      };
    }

    console.warn('[WhatsApp->Teams] Falling back to TEAMS_WEBHOOK_URL');

    // Fallback path: Power Automate or custom webhook relay
    try {
      const webhookUrl = process.env.TEAMS_WEBHOOK_URL;
      if (!webhookUrl) {
        return {
          success: false,
          error: `Bot delivery failed: ${botError.message}. TEAMS_WEBHOOK_URL is not configured.`
        };
      }

      const webhookResp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          groupId,
          source: safeSource,
          sourceGroup: safeSourceGroup,
          originalSender: safeSender,
          content: text,
          formattedMessage
        })
      });

      if (!webhookResp.ok) {
        const body = await webhookResp.text().catch(() => '');
        return {
          success: false,
          error: `Bot failed (${botError.message}). Webhook failed (${webhookResp.status}): ${body || webhookResp.statusText}`
        };
      }

      const respText = await webhookResp.text().catch(() => '');
      if (respText && !/success|ok|sent|accepted/i.test(respText)) {
        return {
          success: false,
          error: `Webhook returned unexpected response: ${respText.slice(0, 200)}`
        };
      }

      return {
        success: true,
        method: 'webhook',
        messageId: `webhook-${Date.now()}`
      };
    } catch (webhookError) {
      console.error('[WhatsApp->Teams] Bot + webhook failed:', webhookError.message);
      return {
        success: false,
        error: `Bot failed (${botError.message}); webhook failed (${webhookError.message})`
      };
    }
  }
}

/**
 * Get available Teams groups/channels for forwarding
 * @returns {Promise<Array<{id: string, name: string, description?: string}>>}
 */
export async function getTeamsGroups() {
  try {
    console.log('[WhatsApp->Teams] Returning configured Teams groups');
    const ids = TEAMS_GROUPS.map(t => t.id);
    const convoRes = await db(
      'SELECT conversation_id, conversation_name FROM teams_conversations WHERE conversation_id = ANY($1)',
      [ids]
    );
    const convoNameById = new Map(convoRes.rows.map(r => [r.conversation_id, r.conversation_name]));

    const formattedTeams = TEAMS_GROUPS.map(team => {
      const actualName = convoNameById.get(team.id) || null;
      return {
        id: team.id,
        // Keep `name` as the effective destination label (actual conversation name when known)
        name: actualName || team.displayName,
        configuredName: team.displayName,
        description: team.description || ''
      };
    });

    console.log(`[WhatsApp->Teams] ${formattedTeams.length} groups available`);
    return formattedTeams;
  } catch (error) {
    console.error('[WhatsApp->Teams] Error getting groups:', error);
    return [];
  }
}
