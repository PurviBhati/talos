import { query as dbQuery } from '../db/index.js';
//conversationStore.js - manages conversation references for Teams interactions
class ConversationStore {
  async save(ref) {
    const sql = `
      INSERT INTO teams_conversations 
        (conversation_id, conversation_name, service_url, tenant_id, bot_id, bot_name, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (conversation_id) 
      DO UPDATE SET
        conversation_name = EXCLUDED.conversation_name,
        service_url = EXCLUDED.service_url,
        tenant_id = EXCLUDED.tenant_id,
        bot_id = EXCLUDED.bot_id,
        bot_name = EXCLUDED.bot_name,
        updated_at = NOW()
    `;
    await dbQuery(sql, [
      ref.conversationId,
      ref.conversationName,
      ref.serviceUrl,
      ref.tenantId,
      ref.botId,
      ref.botName,
    ]);
  }

  async getAll() {
    const result = await dbQuery(
      'SELECT * FROM teams_conversations ORDER BY conversation_name ASC'
    );
    return result.rows;
  }

  async getById(conversationId) {
    const result = await dbQuery(
      'SELECT * FROM teams_conversations WHERE conversation_id = $1',
      [conversationId]
    );
    return result.rows[0];
  }
}

export default new ConversationStore();