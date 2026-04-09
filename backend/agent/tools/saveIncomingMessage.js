import { query } from "../../db/index.js";

export const saveIncomingMessage = async ({ source, sender, content }) => {
  try {
    const result = await query(
      `INSERT INTO incoming_messages (source, sender, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [source, sender, content]
    );

    return result.rows[0];
  } catch (error) {
    console.error("saveIncomingMessage Tool Error:", error);
    throw error;
  }
};