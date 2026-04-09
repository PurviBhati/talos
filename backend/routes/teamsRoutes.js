import express from 'express';
import { UnifiedHubBot } from '../agent/teamsBot.js';
import { adapter, sendToGroupChat, getAllGroupChats } from '../services/teamsService.js';
import conversationStore from '../services/conversationStore.js';
import { requireTenant } from "../middleware/tenantContext.js";
//teamsRoutes.js is for handling outgoing messages and group chat management, while teamsWebhook.js is for handling incoming messages and notifications from Microsoft Graph.
const router = express.Router();
const bot = new UnifiedHubBot(conversationStore);
router.use(requireTenant);

// Webhook: Teams sends all bot activity here
router.post('/messages', async (req, res) => {
  await adapter.processActivity(req, res, async (context) => {
    await bot.run(context);
  });
});

// Get all saved group chats
router.get('/group-chats', async (req, res) => {
  try {
    const chats = await getAllGroupChats();
    res.json({ success: true, chats });
  } catch (err) {
    console.error('Error fetching group chats:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Send message to a specific group chat
router.post('/send', async (req, res) => {
  const { conversationId, message } = req.body;
  if (!conversationId || !message) {
    return res.status(400).json({ success: false, error: 'conversationId and message are required' });
  }
  try {
    await sendToGroupChat(conversationId, message);
    res.json({ success: true, message: 'Message sent successfully' });
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;