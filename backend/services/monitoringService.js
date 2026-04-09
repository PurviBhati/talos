import { query as db } from '../db/index.js';
import whatsappBot from './whatsappBot.js';

class MonitoringService {
  constructor() {
    this.metrics = {
      messagesProcessed: 0,
      messagesForwarded: 0,
      messagesFailed: 0,
      lastActivity: new Date(),
      startTime: new Date(),
      errors: []
    };
    
    this.healthChecks = new Map();
    this.alertThresholds = {
      errorRate: 0.1,        // 10% error rate
      maxErrors: 50,         // Max 50 errors in memory
      inactivityMinutes: 30  // Alert if no activity for 30 minutes
    };
  }

  // Record message processing metrics
  recordMessageProcessed(source, success = true, error = null) {
    this.metrics.messagesProcessed++;
    this.metrics.lastActivity = new Date();
    
    if (success) {
      this.metrics.messagesForwarded++;
    } else {
      this.metrics.messagesFailed++;
      
      if (error) {
        this.recordError(error, { source, type: 'message_processing' });
      }
    }
  }

  // Record system errors
  recordError(error, context = {}) {
    const errorRecord = {
      timestamp: new Date(),
      message: error.message,
      stack: error.stack,
      context,
      id: Date.now() + Math.random()
    };
    
    this.metrics.errors.push(errorRecord);
    
    // Keep only recent errors
    if (this.metrics.errors.length > this.alertThresholds.maxErrors) {
      this.metrics.errors = this.metrics.errors.slice(-this.alertThresholds.maxErrors);
    }
    
    console.error('🚨 Error recorded:', errorRecord);
  }

  // Get current system health status
  async getHealthStatus() {
    try {
      const uptime = Date.now() - this.metrics.startTime.getTime();
      const errorRate = this.metrics.messagesProcessed > 0 
        ? this.metrics.messagesFailed / this.metrics.messagesProcessed 
        : 0;
      
      // Check database connectivity
      const dbHealth = await this.checkDatabaseHealth();
      
      // Check WhatsApp bot status
      const whatsappHealth = this.checkWhatsAppHealth();
      
      // Check for recent activity
      const timeSinceActivity = Date.now() - this.metrics.lastActivity.getTime();
      const isInactive = timeSinceActivity > (this.alertThresholds.inactivityMinutes * 60 * 1000);
      
      // Core health: DB + error budget + activity. WhatsApp is optional (may be pairing / reconnecting).
      const isHealthy = dbHealth.healthy &&
                       errorRate < this.alertThresholds.errorRate &&
                       !isInactive;
      
      return {
        healthy: isHealthy,
        uptime: Math.floor(uptime / 1000), // seconds
        metrics: {
          ...this.metrics,
          errorRate: Math.round(errorRate * 100) / 100,
          timeSinceActivity: Math.floor(timeSinceActivity / 1000)
        },
        components: {
          database: dbHealth,
          whatsapp: whatsappHealth,
          activity: {
            healthy: !isInactive,
            lastActivity: this.metrics.lastActivity,
            timeSinceActivity: Math.floor(timeSinceActivity / 1000)
          }
        },
        recentErrors: this.metrics.errors.slice(-5), // Last 5 errors
        alerts: this.generateAlerts(errorRate, isInactive, dbHealth, whatsappHealth)
      };
    } catch (error) {
      console.error('❌ Health check failed:', error);
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date()
      };
    }
  }

  // Check database connectivity
  async checkDatabaseHealth() {
    try {
      const start = Date.now();
      await db('SELECT 1');
      const responseTime = Date.now() - start;
      
      return {
        healthy: true,
        responseTime,
        status: 'connected'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        status: 'disconnected'
      };
    }
  }

  // Check WhatsApp bot health
  checkWhatsAppHealth() {
    try {
      const status = whatsappBot.getStatus();
      
      return {
        healthy: status.connected,
        ...status,
        status: status.connected ? 'connected' : 'disconnected'
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        status: 'error'
      };
    }
  }

  // Generate health alerts
  generateAlerts(errorRate, isInactive, dbHealth, whatsappHealth) {
    const alerts = [];
    
    if (errorRate > this.alertThresholds.errorRate) {
      alerts.push({
        level: 'warning',
        message: `High error rate: ${Math.round(errorRate * 100)}%`,
        threshold: `${this.alertThresholds.errorRate * 100}%`
      });
    }
    
    if (isInactive) {
      alerts.push({
        level: 'warning',
        message: `No activity for ${this.alertThresholds.inactivityMinutes} minutes`,
        threshold: `${this.alertThresholds.inactivityMinutes} minutes`
      });
    }
    
    if (!dbHealth.healthy) {
      alerts.push({
        level: 'critical',
        message: 'Database connection failed',
        details: dbHealth.error
      });
    }
    
    if (!whatsappHealth.healthy) {
      alerts.push({
        level: 'warning',
        message: 'WhatsApp bot disconnected',
        details: whatsappHealth.error || 'Bot not ready'
      });
    }
    
    return alerts;
  }

  // Get metrics summary
  getMetricsSummary() {
    const uptime = Date.now() - this.metrics.startTime.getTime();
    const errorRate = this.metrics.messagesProcessed > 0 
      ? this.metrics.messagesFailed / this.metrics.messagesProcessed 
      : 0;
    
    return {
      uptime: Math.floor(uptime / 1000),
      messagesProcessed: this.metrics.messagesProcessed,
      messagesForwarded: this.metrics.messagesForwarded,
      messagesFailed: this.metrics.messagesFailed,
      errorRate: Math.round(errorRate * 100) / 100,
      lastActivity: this.metrics.lastActivity,
      recentErrorCount: this.metrics.errors.length
    };
  }

  // Reset metrics (for testing or maintenance)
  resetMetrics() {
    this.metrics = {
      messagesProcessed: 0,
      messagesForwarded: 0,
      messagesFailed: 0,
      lastActivity: new Date(),
      startTime: new Date(),
      errors: []
    };
    
    console.log('📊 Monitoring metrics reset');
  }

  // Update alert thresholds
  updateThresholds(newThresholds) {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
    console.log('⚙️ Alert thresholds updated:', this.alertThresholds);
  }
}

// Create singleton instance
const monitoringService = new MonitoringService();

export default monitoringService;
export { MonitoringService };