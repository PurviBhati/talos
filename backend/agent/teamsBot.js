import { ActivityHandler } from 'botbuilder';
import { query } from '../db/index.js';

export class UnifiedHubBot extends ActivityHandler {
  constructor(conversationStore) {
    super();
    this.conversationStore = conversationStore;

    this.onMembersAdded(async (context, next) => {
      const membersAdded = context.activity.membersAdded;
      for (const member of membersAdded) {
        if (member.id !== context.activity.recipient.id) {
          await context.sendActivity('👋 UnifiedHub Bot is ready!');
        }
      }
      await next();
    });

    this.onMessage(async (context, next) => {
      const conversationRef = {
        conversationId: context.activity.conversation.id,
        conversationName: context.activity.conversation.name || 'Group Chat',
        serviceUrl: context.activity.serviceUrl,
        tenantId: context.activity.channelData?.tenant?.id,
        botId: context.activity.recipient.id,
        botName: context.activity.recipient.name,
      };

      await this.conversationStore.save(conversationRef);
      console.log(`📌 Saved conversation: ${conversationRef.conversationName}`);

      const text = (context.activity.text || '').trim().toLowerCase();
      const replyToId = context.activity.replyToId || null;
      if (text === 'done' && replyToId) {
        try {
          const tenantId = conversationRef.tenantId || process.env.DEFAULT_TENANT_ID || 'tenant-default';
          const doneBy = context.activity.from?.name || context.activity.from?.id || 'unknown';
          const result = await query(
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
          if (result.rows.length > 0) {
            await context.sendActivity(`Marked done for task #${result.rows[0].id}.`);
            console.log(`✅ Task marked done via Teams reply: ${replyToId}`);
          }
        } catch (err) {
          console.error(`❌ Failed to mark task done from Teams reply: ${err.message}`);
        }
      }

      await next();
    });
  }
}