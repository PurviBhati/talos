import express from 'express';
import monitoringService from '../services/monitoringService.js';

const router = express.Router();

// GET /api/monitoring/health - Get system health status
router.get('/health', async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    
    // Set appropriate HTTP status based on health
    const statusCode = health.healthy ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({ 
      healthy: false, 
      error: error.message,
      timestamp: new Date()
    });
  }
});

// GET /api/monitoring/metrics - Get metrics summary
router.get('/metrics', (req, res) => {
  try {
    const metrics = monitoringService.getMetricsSummary();
    res.json(metrics);
  } catch (error) {
    console.error('Metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/monitoring/reset - Reset metrics (admin only)
router.post('/reset', (req, res) => {
  try {
    monitoringService.resetMetrics();
    res.json({ message: 'Metrics reset successfully' });
  } catch (error) {
    console.error('Reset metrics error:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/monitoring/thresholds - Update alert thresholds
router.put('/thresholds', (req, res) => {
  try {
    const { thresholds } = req.body;
    
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({ error: 'Thresholds object is required' });
    }
    
    monitoringService.updateThresholds(thresholds);
    res.json({ message: 'Alert thresholds updated successfully' });
  } catch (error) {
    console.error('Update thresholds error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/monitoring/errors - Get recent errors
router.get('/errors', async (req, res) => {
  try {
    const health = await monitoringService.getHealthStatus();
    res.json({
      errors: health.recentErrors || [],
      totalErrors: health.metrics?.errors?.length || 0
    });
  } catch (error) {
    console.error('Get errors error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;