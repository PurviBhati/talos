import { query } from "../../db/index.js";

/**
 * Approve an AI draft — marks it as approved in the ai_drafts table and,
 * if the draft originated from a teams_message, updates that row too.
 *
 * @param {Object} options
 * @param {number} options.draftId          - Primary key of the ai_drafts row
 * @param {string} [options.approvedText]   - Optional override text (uses existing draft_text if omitted)
 * @returns {Promise<Object>}               - The updated ai_drafts row
 */
export const approveDraft = async ({ draftId, approvedText } = {}) => {
  if (!draftId) throw new Error("approveDraft: draftId is required");

  // Fetch the current draft first so we can reuse draft_text if no override
  const current = await query(
    `SELECT * FROM ai_drafts WHERE id = $1`,
    [draftId]
  );

  if (current.rows.length === 0) {
    throw new Error(`approveDraft: draft ${draftId} not found`);
  }

  const draft = current.rows[0];
  const finalText = approvedText || draft.draft_text;

  // Update the draft record
  const result = await query(
    `UPDATE ai_drafts
     SET approved       = true,
         approval_status = 'approved',
         draft_text      = $1,
         updated_at      = NOW()
     WHERE id = $2
     RETURNING *`,
    [finalText, draftId]
  );

  const updated = result.rows[0];

  // If the draft is linked to a teams_message, sync its approval status too
  if (draft.message_id) {
    try {
      await query(
        `UPDATE teams_messages
         SET approval_status = 'approved',
             approved_draft  = $1
         WHERE id = $2`,
        [finalText, draft.message_id]
      );
    } catch (err) {
      // Non-fatal — draft table is the source of truth
      console.warn("approveDraft: could not update teams_messages row:", err.message);
    }
  }

  console.log(`✅ approveDraft: draft ${draftId} approved`);
  return updated;
};
