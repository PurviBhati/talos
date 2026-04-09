import { sendWhatsAppMedia, sendWhatsAppMessage } from '../services/whatsappService.js';

function isLikelyPhone(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  if (/[a-zA-Z@]/.test(s)) return false;
  const digits = s.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * Tool for sending WhatsApp messages (via whatsapp-web.js bot).
 * Used by OpenClaw agent and admin routes.
 * `to` is either a phone (E.164 or digits) or a WhatsApp group name matching SELECTED_WHATSAPP_GROUPS.
 */
export async function sendWhatsApp(to, message, options = {}) {
  try {
    let destination = String(to || "").trim();
    if (isLikelyPhone(destination) && !destination.startsWith("+")) {
      const digits = destination.replace(/\D/g, "");
      const cc = (process.env.DEFAULT_COUNTRY_CODE || "+91").replace(/\D/g, "");
      destination = digits.length <= 10 ? `+${cc}${digits}` : `+${digits}`;
    }

    const recipients = [destination];
    let rows;
    if (options.mediaUrl) {
      rows = await sendWhatsAppMedia(options.mediaUrl, recipients, message || '');
    } else {
      rows = await sendWhatsAppMessage(message, recipients);
    }

    const first = Array.isArray(rows) ? rows[0] : rows;
    if (first?.status === 'sent' && first.sid) {
      return {
        success: true,
        messageSid: first.sid,
        status: 'sent',
        to: destination,
        sentAt: new Date().toISOString(),
      };
    }

    return {
      success: false,
      error: first?.error || "WhatsApp send failed",
      to: destination,
    };
  } catch (error) {
    console.error('❌ sendWhatsApp tool error:', error.message);
    return {
      success: false,
      error: error.message,
      to,
    };
  }
}

export default sendWhatsApp;
