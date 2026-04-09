// Shared rules: only development tasks + explicit client approvals may be auto-forwarded.

/** Model / extractor categories that must never be forwarded */
export const EXCLUDED_FORWARD_CATEGORIES = new Set([
  "greeting",
  "meeting_request",
  "payment",
  "invoice",
  "hr_internal",
  "system",
  "irrelevant",
  "exclude",
  "social",
  "billing",
  "scheduling",
  "general_chat",
  "small_talk",
  "other",
  "question",
]);

const TASK_LIKE = new Set([
  "change_request",
  "design_feedback",
  "project_update",
  "technical_issue",
  "deadline",
  "file_share",
  "link_share",
  "task_work",
  "urgent",
  "feedback",
  "new_project",
  "follow_up",
]);

const BLOCKED_CONTENT_RE =
  /\b(meet(ing)?|schedule|scheduled|reschedul(e|ed|ing)|calendar|availability|available (now|today|tomorrow)|call\b|zoom\b|google meet|teams meeting|invoice|invoices|billing|payment|payments|quotation|quote|proforma|po\b|purchase order)\b/i;

export function isForwardEligibleCategory(category) {
  if (category == null || category === "") return false;
  const c = String(category).toLowerCase().trim();
  if (EXCLUDED_FORWARD_CATEGORIES.has(c)) return false;
  if (c === "client_approval") return true;
  return TASK_LIKE.has(c);
}

/**
 * Deterministic guardrail: never auto-forward meeting/scheduling/payment chat.
 * This runs in addition to model classification.
 */
export function hasBlockedForwardContent(...parts) {
  const text = parts
    .flatMap((p) => (Array.isArray(p) ? p : [p]))
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!text.trim()) return false;
  return BLOCKED_CONTENT_RE.test(text);
}

/** Post-filter extracted batch tasks (Slack / WhatsApp scanners) */
export function filterExtractedTasksForForward(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks.filter((task) => {
    const cat = (task.category || "").toLowerCase().trim();
    if (EXCLUDED_FORWARD_CATEGORIES.has(cat)) return false;
    if (cat === "client_approval") return true;
    if (!TASK_LIKE.has(cat)) return false;
    const blob = `${task.title || ""} ${task.description || ""}`.toLowerCase();
    if (hasBlockedForwardContent(blob)) {
      return false;
    }
    return true;
  });
}
