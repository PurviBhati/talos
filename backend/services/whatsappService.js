import twilio from "twilio";
import db from "../db/index.js";

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

function resolveWhatsAppFrom() {
  const raw = process.env.TWILIO_WHATSAPP_FROM || process.env.TWILIO_WHATSAPP_NUMBER || "";
  const s = String(raw).trim();
  if (!s) return "";
  return s.startsWith("whatsapp:") ? s : `whatsapp:${s}`;
}

const FROM_NUMBER = resolveWhatsAppFrom();

function toWhatsAppAddress(number) {
  const clean = String(number || "").trim();
  return clean.startsWith("whatsapp:") ? clean : `whatsapp:${clean}`;
}

// ─── Get numbers from channel_mappings ───────────────────────────────────────

export async function getWhatsAppNumbers(threadId = null) {
  let result;

  if (threadId) {
    result = await db.query(
      `SELECT whatsapp_numbers FROM channel_mappings WHERE teams_thread_id = $1 AND active = true LIMIT 1`,
      [threadId]
    );
    return result.rows[0]?.whatsapp_numbers || [];
  }

  result = await db.query(`SELECT whatsapp_numbers FROM channel_mappings WHERE active = true`);
  const all = result.rows.flatMap((r) => r.whatsapp_numbers || []);
  return [...new Set(all)];
}

// ─── Send Image / media URL ───────────────────────────────────────────────────

export async function sendWhatsAppMedia(mediaUrl, numbers = [], caption = "") {
  if (!FROM_NUMBER) {
    console.warn("[WhatsApp] sendWhatsAppMedia — TWILIO_WHATSAPP_FROM is not set");
    return numbers.map((number) => ({ number, status: "failed", error: "Missing Twilio WhatsApp from number" }));
  }
  if (!numbers.length) {
    console.warn("[WhatsApp] sendWhatsAppMedia — no recipient numbers");
    return [];
  }
  const results = [];
  for (const number of numbers) {
    try {
      const msg = await twilioClient.messages.create({
        from: FROM_NUMBER,
        to: toWhatsAppAddress(number),
        mediaUrl: [mediaUrl],
        body: caption || "",
      });
      results.push({ number, status: "sent", sid: msg.sid });
    } catch (err) {
      console.error(`[WhatsApp] media send failed to ${number}: ${err.message}`);
      results.push({ number, status: "failed", error: err.message });
    }
  }
  return results;
}

// ─── Send Document (same as media with caption) ─────────────────────────────

export async function sendWhatsAppDocument(mediaUrl, fileName, senderName, numbers = []) {
  const caption = `📄 ${fileName}\nShared by ${senderName} via Teams`;
  return sendWhatsAppMedia(mediaUrl, numbers, caption);
}

// ─── Send Text ────────────────────────────────────────────────────────────────

export async function sendWhatsAppText(text, numbers = []) {
  if (!FROM_NUMBER) {
    console.warn("[WhatsApp] sendWhatsAppText — TWILIO_WHATSAPP_FROM is not set");
    return numbers.map((number) => ({ number, status: "failed", error: "Missing Twilio WhatsApp from number" }));
  }
  if (!numbers.length) {
    console.warn("[WhatsApp] sendWhatsAppText — no recipient numbers");
    return [];
  }
  const results = [];
  for (const number of numbers) {
    try {
      const msg = await twilioClient.messages.create({
        from: FROM_NUMBER,
        to: toWhatsAppAddress(number),
        body: text,
      });
      results.push({ number, status: "sent", sid: msg.sid });
    } catch (err) {
      console.error(`[WhatsApp] text send failed to ${number}: ${err.message}`);
      results.push({ number, status: "failed", error: err.message });
    }
  }
  return results;
}

export async function sendWhatsAppMessage(text, numbers = []) {
  return sendWhatsAppText(text, numbers);
}

// ─── Send approved draft ──────────────────────────────────────────────────────

export async function sendWhatsAppApprovedMessage(text, threadId = null) {
  const numbers = await getWhatsAppNumbers(threadId);
  if (!numbers.length) {
    console.warn("[WhatsApp] sendWhatsAppApprovedMessage — no numbers in channel_mappings");
    return [];
  }
  return sendWhatsAppText(text, numbers);
}
