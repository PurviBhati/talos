// backend/utils/slackMapper.js

export const CHANNEL_NAMES = {
  "C0AHE5C59NH": "#privateopenclawdemo",
  "C0AHHG10HDG": "#openclawtest",
  "C0AH24BPHRD": "#testdemo",
};

/**
 * Resolves a Slack channel ID or name to a human-readable name.
 * @param {string} id - The Slack channel ID.
 * @param {string} currentName - The current name stored (might be ID).
 * @returns {string} - The human-readable name.
 */
export function resolveSlackChannel(id, currentName) {
  if (CHANNEL_NAMES[id]) return CHANNEL_NAMES[id];
  if (CHANNEL_NAMES[currentName]) return CHANNEL_NAMES[currentName];

  // Never display technical IDs as channel names.
  const isIdLike = (v) => typeof v === 'string' && /^C[A-Z0-9]{10}$/.test(v);
  if (isIdLike(currentName) || isIdLike(id)) return currentName && !isIdLike(currentName) ? currentName : 'Unknown Channel';

  return currentName || 'Unknown Channel';
}
