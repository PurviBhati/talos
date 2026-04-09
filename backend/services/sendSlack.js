import pkg from '@slack/web-api';
const { WebClient } = pkg;
//sendSlack.js
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const DEFAULT_CHANNELS = [
  process.env.SLACK_CHANNEL_1,
  process.env.SLACK_CHANNEL_2,
  process.env.SLACK_CHANNEL_3,
].filter(Boolean);

// ─── Normalize channels input ─────────────────────────────────────────────────
function normalizeChannels(channels) {
  if (!channels || (Array.isArray(channels) && channels.length === 0)) {
    return DEFAULT_CHANNELS;
  }
  if (Array.isArray(channels)) {
    return channels.map(c => String(c).trim()).filter(Boolean);
  }
  if (typeof channels === 'string') {
    const s = channels.trim();
    if (s.startsWith('{') && s.endsWith('}')) {
      return s.slice(1, -1).split(',').map(c => c.trim()).filter(Boolean);
    }
    try {
      const parsed = JSON.parse(s);
      if (Array.isArray(parsed)) return parsed.map(c => String(c).trim()).filter(Boolean);
    } catch { /* not JSON */ }
    if (s.length > 0) return [s];
  }
  return DEFAULT_CHANNELS;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getFileLabel(fileName = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const labels = {
    pdf: 'PDF Document', doc: 'Word Document', docx: 'Word Document',
    xls: 'Excel Spreadsheet', xlsx: 'Excel Spreadsheet', csv: 'CSV File',
    ppt: 'PowerPoint', pptx: 'PowerPoint',
    txt: 'Text File', rtf: 'Rich Text',
    zip: 'ZIP Archive', rar: 'RAR Archive', '7z': '7-Zip Archive',
    jpg: 'Image', jpeg: 'Image', png: 'Image', gif: 'GIF', webp: 'Image',
  };
  return labels[ext] || 'File';
}

function getFileEmoji(fileName = '') {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  const icons = {
    pdf: '📄', doc: '📝', docx: '📝',
    xls: '📊', xlsx: '📊', csv: '📊',
    ppt: '📋', pptx: '📋',
    txt: '🗒️', rtf: '🗒️',
    zip: '🗜️', rar: '🗜️', '7z': '🗜️', tar: '🗜️', gz: '🗜️',
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', webp: '🖼️',
  };
  return icons[ext] || '📎';
}

// ─── Send plain text to one or more channels ──────────────────────────────────
// Usage: sendSlackText(text, channels?)
export async function sendSlackText(text, channels = DEFAULT_CHANNELS) {
  const resolvedChannels = normalizeChannels(channels);
  const results = [];
  for (const channel of resolvedChannels) {
    try {
      const result = await slack.chat.postMessage({ channel, text, mrkdwn: true });
      console.log(`[Slack] ✅ Text posted to ${channel}`);
      results.push({ channel, status: 'sent', ts: result.ts });
    } catch (err) {
      console.error(`[Slack] ❌ Failed to post text to ${channel}:`, err.message);
      results.push({ channel, status: 'failed', error: err.message });
    }
  }
  return results;
}

// ─── Send message: sendSlackMessage(channel, text, options?) ──────────────────
// OR: sendSlackMessage(text, channels?) — both signatures supported
export async function sendSlackMessage(channelOrText, textOrChannels, options = {}) {
  // Detect signature: if second arg is a string (text), use (channel, text) form
  if (typeof textOrChannels === 'string') {
    const channel = channelOrText;
    const text = textOrChannels;
    const sender = options?.sender || '';
    const formatted = sender ? `*${sender}*\n${text}` : text;
    return sendSlackText(formatted, [channel]);
  }
  // Otherwise: sendSlackMessage(text, channels?)
  return sendSlackText(channelOrText, textOrChannels);
}

// ─── Send file ────────────────────────────────────────────────────────────────
export async function sendSlackFile(publicUrl, fileName, senderName, fileCategory = 'document', channels = DEFAULT_CHANNELS) {
  const resolvedChannels = normalizeChannels(channels);
  const emoji = getFileEmoji(fileName);
  const label = getFileLabel(fileName);
  const isImage = fileCategory === 'image' || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(fileName);
  const results = [];

  for (const channel of resolvedChannels) {
    try {
      const blocks = [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*From Appsrow*\n<${publicUrl}|${fileName}>`,
          },
        },
      ];

      if (isImage) {
        blocks.push({
          type: 'image',
          image_url: publicUrl,
          alt_text: fileName,
          title: { type: 'plain_text', text: fileName },
        });
      }

      blocks.push({ type: 'divider' });

      const result = await slack.chat.postMessage({
        channel,
        text: `From Appsrow: ${fileName}`,
        blocks,
      });

      console.log(`[Slack] ✅ File posted to ${channel}`);
      results.push({ channel, status: 'sent', ts: result.ts });
    } catch (err) {
      console.error(`[Slack] ❌ Failed to post file to ${channel}:`, err.message);
      results.push({ channel, status: 'failed', error: err.message });
    }
  }
  return results;
}

// ─── Send message with files ───────────────────────────────────────────────────
// Usage: sendSlackMessageWithFiles(channel, text, files, options?)
// files = [{ name, url, publicUrl, contentType }]
export async function sendSlackMessageWithFiles(channel, text, files = [], options = {}) {
  const sender = options?.sender || '';
  const formatted = sender ? `*${sender}*\n${text}` : text;
  const results = [];

  // Send text first
  if (formatted.trim()) {
    const r = await sendSlackText(formatted, [channel]);
    results.push(...r);
  }

  // Send each file
  for (const file of files) {
    const url = file.publicUrl || file.url;
    if (!url || !file.name) continue;
    const isImage = file.contentType?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
    const r = await sendSlackFile(url, file.name, sender || 'Teams', isImage ? 'image' : 'document', [channel]);
    results.push(...r);
  }

  return results;
}

export async function sendSlackApprovedMessage(text, channels = DEFAULT_CHANNELS) {
  return sendSlackText(`✅ *Approved Response:*\n${text}`, channels);
}