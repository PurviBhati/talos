import { query } from "../../db/index.js";

export const logAction = async ({
  draftId,
  actionType,
  performedBy,
  metadata = {},
}) => {
  try {
    await query(
      `
      INSERT INTO message_logs (draft_id, action_type, performed_by, metadata)
      VALUES ($1, $2, $3, $4)
      `,
      [draftId, actionType, performedBy, metadata]
    );
  } catch (error) {
    console.error("Logging error:", error);
  }
};