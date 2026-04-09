import express from 'express';
import { query } from "../db/index.js";

const router = express.Router();

// POST /api/dismiss/slack/:id - Dismiss a single Slack message
router.post('/slack/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await query('UPDATE slack_messages SET dismissed = true WHERE id = $1', [id]);
    res.json({ success: true, message: 'Message dismissed' });
  } catch (error) {
    console.error('Dismiss error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/dismiss/slack/bulk - Dismiss multiple Slack messages
router.post('/slack/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    await query('UPDATE slack_messages SET dismissed = true WHERE id = ANY($1)', [ids]);
    res.json({ success: true, message: `${ids.length} messages dismissed` });
  } catch (error) {
    console.error('Bulk dismiss error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/dismiss/teams/:id - Dismiss a single Teams message
router.post('/teams/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await query('UPDATE teams_messages SET dismissed = true WHERE id = $1', [id]);
    res.json({ success: true, message: 'Message dismissed' });
  } catch (error) {
    console.error('Dismiss error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/dismiss/whatsapp/:id - Dismiss a single WhatsApp message
router.post('/whatsapp/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await query('UPDATE whatsapp_messages SET dismissed = true WHERE id = $1', [id]);
    res.json({ success: true, message: 'Message dismissed' });
  } catch (error) {
    console.error('Dismiss error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/dismiss/whatsapp/bulk - Dismiss multiple WhatsApp messages
router.post('/whatsapp/bulk', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'ids array is required' });
    }
    await query('UPDATE whatsapp_messages SET dismissed = true WHERE id = ANY($1)', [ids]);
    res.json({ success: true, message: `${ids.length} messages dismissed` });
  } catch (error) {
    console.error('Bulk dismiss error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/dismiss/whatsapp/all-non-allowed - Dismiss all messages not from allowed groups
router.post('/whatsapp/all-non-allowed', async (req, res) => {
  try {
    console.log('🧹 Dismissing all non-allowed group messages and personal chats...');
    
    const allowedGroups = ['Test grp', 'Appsrow - demo grp'];
    
    // Add dismissed column if it doesn't exist
    await query(`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE`);
    
    // Mark all messages as dismissed except those from allowed groups
    const result = await query(`
      UPDATE whatsapp_messages 
      SET dismissed = TRUE
      WHERE (group_name IS NULL OR group_name NOT IN ('Test grp', 'Appsrow - demo grp'))
        AND (dismissed IS NULL OR dismissed = FALSE)
      RETURNING id, sender, group_name
    `);
    
    console.log(`🧹 Dismissed ${result.rows.length} messages`);
    
    // Count by group
    const groupCounts = {};
    result.rows.forEach(row => {
      const group = row.group_name || 'Personal Chat';
      groupCounts[group] = (groupCounts[group] || 0) + 1;
    });
    
    console.log('📊 Dismissed messages by group:', groupCounts);
    
    res.json({
      success: true,
      dismissed: result.rows.length,
      dismissedByGroup: groupCounts,
      allowedGroups,
      message: 'All personal chats and non-allowed group messages have been dismissed'
    });
  } catch (error) {
    console.error('❌ Dismiss all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/dismiss/whatsapp/cleanup-personal - Clean up all personal chats
router.post('/whatsapp/cleanup-personal', async (req, res) => {
  try {
    console.log('🧹 Cleaning up all personal chats...');
    
    // Add dismissed column if it doesn't exist
    await query(`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE`);
    
    // Mark all personal chats (group_name IS NULL) as dismissed
    const result = await query(`
      UPDATE whatsapp_messages 
      SET dismissed = TRUE
      WHERE group_name IS NULL
        AND (dismissed IS NULL OR dismissed = FALSE)
      RETURNING id, sender
    `);
    
    console.log(`🧹 Dismissed ${result.rows.length} personal chat messages`);
    
    res.json({
      success: true,
      dismissed: result.rows.length,
      message: 'All personal chat messages have been dismissed'
    });
  } catch (error) {
    console.error('❌ Cleanup personal error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
