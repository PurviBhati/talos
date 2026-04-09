import express from 'express';
import whatsappBot from '../services/whatsappBot.js';
//whatsappBotRoutes.js - API routes for WhatsApp bot status, QR code, session reset, and group info
const router = express.Router();

// ─── GET /api/whatsapp-bot/status ─────────────────────────────────────────────
router.get('/status', (req, res) => {
  res.json(whatsappBot.getStatus());
});

// ─── GET /api/whatsapp-bot/qr ─────────────────────────────────────────────────
// Returns QR as base64 data URL if waiting, or connected status + groups
router.get('/qr', async (req, res) => {
  try {
    const status = whatsappBot.getStatus();

    if (status.connected) {
      const groups = await whatsappBot.getGroups();
      return res.json({ connected: true, status: 'ready', groups });
    }

    const qrDataUrl = whatsappBot.getQRDataUrl();
    const qrRaw = whatsappBot.getQR();

    if (qrDataUrl || qrRaw) {
      return res.json({ connected: false, status: 'qr', qr: qrDataUrl || null });
    }

    return res.json({ connected: false, status: status.status || 'initializing', qr: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/whatsapp-bot/reset-session ─────────────────────────────────────
// Deletes saved session and forces new QR scan — use to switch WhatsApp number
router.post('/reset-session', async (req, res) => {
  try {
    const result = await whatsappBot.resetSession();
    res.json(result);
  } catch (err) {
    console.error('❌ Reset session error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/whatsapp-bot/restart ──────────────────────────────────────────
router.post('/restart', async (req, res) => {
  try {
    const result = await whatsappBot.restart();
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── GET /api/whatsapp-bot/groups ────────────────────────────────────────────
router.get('/groups', async (req, res) => {
  try {
    const groups = await whatsappBot.getGroups();
    res.json({ success: true, groups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;