// backend/services/summaryHelper.js
// Drop this file in backend/services/ and import where needed.

const PYTHON_SERVICE_URL = "http://localhost:8000";

/**
 * Fetches the stored extraction for a channel from the Python service.
 * Returns the raw extraction string if found, null if not.
 */
export async function getChannelSummary(source, channelId) {
  try {
    const encoded = encodeURIComponent(channelId);
    const res = await fetch(`${PYTHON_SERVICE_URL}/summary/${source}/${encoded}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(3000), // Never blocks forwarding
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.success && data.summary_text ? data.summary_text : null;

  } catch (err) {
    console.warn(`⚠️ Summary service unavailable: ${err.message}`);
    return null;
  }
}

/**
 * Parses the raw GPT extraction (TASK: / FILES: / LINKS: format)
 * into a clean Teams-ready block.
 *
 * Returns empty string if nothing actionable.
 */
function formatExtractionBlock(rawResult) {
  if (!rawResult || rawResult.trim() === "NO_ACTION") return "";

  const lines = rawResult.trim().split("\n");
  const formatted = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("TASK:")) {
      const value = trimmed.slice(5).trim();
      if (value) formatted.push(`📌 *Task:* ${value}`);
    } else if (trimmed.startsWith("FILES:")) {
      const value = trimmed.slice(6).trim();
      if (value) formatted.push(`📎 *Files:* ${value}`);
    } else if (trimmed.startsWith("LINKS:")) {
      const value = trimmed.slice(6).trim();
      if (value) formatted.push(`🔗 *Links:* ${value}`);
    }
  }

  if (formatted.length === 0) return "";

  const block = formatted.join("\n");
  return `\n\n─────────────────────\n${block}\n─────────────────────`;
}

/**
 * Appends extracted task/files/links to a message before sending to Teams.
 * If nothing actionable found, returns the original message unchanged.
 */
export async function attachSummaryContext(message, source, channelId) {
  const rawExtraction = await getChannelSummary(source, channelId);

  if (!rawExtraction) return message;

  const block = formatExtractionBlock(rawExtraction);
  if (!block) return message; // NO_ACTION — send as-is

  return message + block;
}

/**
 * Triggers a fresh extraction for one channel.
 * Optional — call this after a message is forwarded to keep data fresh.
 */
export async function refreshChannelSummary(source, channelId) {
  try {
    const encoded = encodeURIComponent(channelId);
    await fetch(`${PYTHON_SERVICE_URL}/summarize/${source}/${encoded}`, {
      method: "POST",
      signal: AbortSignal.timeout(10000),
    });
  } catch (err) {
    console.warn(`⚠️ Could not refresh extraction: ${err.message}`);
  }
}