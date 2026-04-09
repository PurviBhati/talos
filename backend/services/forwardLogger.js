import { query as db } from "../db/index.js";
//forwardLogger.js
/**
 * Logs a forward attempt to the forward_logs table.
 * FIX: Table name was forward_log (missing s) — now correctly forward_logs
 */
export async function logForward({
  source,
  destination,
  source_channel,
  dest_channel,
  message_preview,
  status,
  error_reason = null,
  task_id = null,
  ai_category = null,
  ai_reason = null,
  is_batched = false,
  media_urls = []
}) {
  try {
    // Product rule: only external -> Teams is valid for forward logs.
    // Skip any Teams-origin logging to keep the table aligned with flow.
    const src = String(source || "").toLowerCase();
    const dest = String(destination || "").toLowerCase();
    const isAllowedFlow = (src === "whatsapp" || src === "slack") && dest === "teams";
    if (!isAllowedFlow) return;

    await db(
      `INSERT INTO forward_logs
        (source, destination, source_channel, dest_channel, message_preview, status, error_reason, task_id, ai_category, ai_reason, is_batched, media_urls, forwarded_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())`,
      [
        source,
        destination,
        source_channel || "unknown",
        dest_channel || "unknown",
        (message_preview || "").slice(0, 120),
        status,
        error_reason,
        task_id || null,
        ai_category,
        ai_reason,
        is_batched,
        JSON.stringify(media_urls || [])
      ]
    );
  } catch (err) {
    console.error("⚠️ forwardLogger failed:", err.message);
  }
}