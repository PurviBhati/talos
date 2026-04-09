import pool from "../../db/index.js";

export const createDraft = async ({
  messageId,
  draftText,
  suggestedPlatform,
  priority = "normal",
}) => {
  try {
    const result = await pool.query(
      `INSERT INTO ai_drafts 
       (message_id, draft_text, suggested_platform, priority)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [messageId, draftText, suggestedPlatform, priority]
    );

    return result.rows[0];
  } catch (error) {
    console.error("createDraft Tool Error:", error);
    throw error;
  }
};