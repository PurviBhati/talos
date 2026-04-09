import express from 'express';
import { cleanupOldMessages, getCleanupStats, updateRetentionConfig } from '../services/messageCleanup.js';

const router = express.Router();

// GET /api/cleanup/stats - Get cleanup statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await getCleanupStats();
    res.json(stats);
  } catch (error) {
    console.error('Cleanup stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/cleanup/run - Manually trigger cleanup
router.post('/run', async (req, res) => {
  try {
    const result = await cleanupOldMessages();
    res.json(result);
  } catch (error) {
    console.error('Manual cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/cleanup/config - Update retention configuration
router.put('/config', (req, res) => {
  try {
    const { platform, config } = req.body;
    
    if (!platform || !config) {
      return res.status(400).json({ error: 'Platform and config are required' });
    }
    
    updateRetentionConfig(platform, config);
    res.json({ message: `${platform} retention config updated successfully` });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;