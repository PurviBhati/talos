import  { query as db } from '../db/index.js';

function isCleanupEnabled() {
  return String(process.env.MESSAGE_CLEANUP_ENABLED || '').toLowerCase() !== 'false';
}

// Configuration for message retention
const RETENTION_CONFIG = {
  slack: {
    recentHours: 24,       // Keep last 24 hours fully
    yesterdayCount: 50,    // Keep more messages from yesterday
    maxAgeDays: 25         // Match client history window
  },
  teams: {
    maxAgeDays: 7          // Keep 7 days
  },
  whatsapp: {
    maxAgeDays: 25         // Keep 25 days — matches client history window
  }
};

/**
 * Auto-cleanup old messages from database
 * Configurable retention policies per platform
 */
export async function cleanupOldMessages() {
  const startTime = Date.now();
  let totalCleaned = 0;

  try {
    console.log('🧹 Starting message cleanup...');
    
    // Cleanup Slack messages
    const slackCleaned = await cleanupSlackMessages();
    totalCleaned += slackCleaned;
    
    // Cleanup Teams messages
    const teamsCleaned = await cleanupTeamsMessages();
    totalCleaned += teamsCleaned;
    
    // Cleanup WhatsApp messages
    const whatsappCleaned = await cleanupWhatsAppMessages();
    totalCleaned += whatsappCleaned;
    
    const duration = Date.now() - startTime;
    console.log(`✅ Message cleanup completed in ${duration}ms. Total cleaned: ${totalCleaned} messages`);
    
    return {
      success: true,
      totalCleaned,
      duration,
      breakdown: {
        slack: slackCleaned,
        teams: teamsCleaned,
        whatsapp: whatsappCleaned
      }
    };

  } catch (error) {
    console.error('❌ Message cleanup error:', error.message);
    return {
      success: false,
      error: error.message,
      totalCleaned
    };
  }
}

async function cleanupSlackMessages() {
  try {
    const now = new Date();
    const config = RETENTION_CONFIG.slack;
    
    // Calculate time boundaries
    const recentCutoff = new Date(now.getTime() - config.recentHours * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
    const maxAgeCutoff = new Date(now.getTime() - config.maxAgeDays * 24 * 60 * 60 * 1000);

    // Delete old messages (older than max age)
    const oldResult = await db( 
      `DELETE FROM slack_messages WHERE timestamp < $1`,
      [maxAgeCutoff]
    );

    // Delete yesterday's messages except the most recent ones
    const yesterdayQuery = `
      DELETE FROM slack_messages 
      WHERE timestamp >= $1 AND timestamp < $2
      AND id NOT IN (
        SELECT id FROM slack_messages 
        WHERE timestamp >= $1 AND timestamp < $2
        ORDER BY timestamp DESC 
        LIMIT $3
      )
    `;
    
    const yesterdayResult = await db( yesterdayQuery, [
      startOfYesterday, 
      startOfToday, 
      config.yesterdayCount
    ]);

    const totalCleaned = (oldResult.rowCount || 0) + (yesterdayResult.rowCount || 0);
    
    if (totalCleaned > 0) {
      console.log(`🧹 Cleaned up ${totalCleaned} Slack messages (${oldResult.rowCount || 0} old, ${yesterdayResult.rowCount || 0} yesterday)`);
    }

    return totalCleaned;
  } catch (error) {
    console.error('❌ Slack cleanup error:', error);
    throw error;
  }
}

async function cleanupTeamsMessages() {
  try {
    const config = RETENTION_CONFIG.teams;
    const cutoffDate = new Date(Date.now() - config.maxAgeDays * 24 * 60 * 60 * 1000);
    
    const result = await db( 
      `DELETE FROM teams_messages WHERE timestamp < $1`,
      [cutoffDate]
    );
    
    const cleaned = result.rowCount || 0;
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} Teams messages`);
    }

    return cleaned;
  } catch (error) {
    console.error('❌ Teams cleanup error:', error);
    throw error;
  }
}

async function cleanupWhatsAppMessages() {
  try {
    const config = RETENTION_CONFIG.whatsapp;
    const cutoffDate = new Date(Date.now() - config.maxAgeDays * 24 * 60 * 60 * 1000);
    
    const result = await db( 
      `DELETE FROM whatsapp_messages WHERE timestamp < $1`,
      [cutoffDate]
    );
    
    const cleaned = result.rowCount || 0;
    if (cleaned > 0) {
      console.log(`🧹 Cleaned up ${cleaned} WhatsApp messages`);
    }

    return cleaned;
  } catch (error) {
    console.error('❌ WhatsApp cleanup error:', error);
    throw error;
  }
}

/**
 * Get cleanup statistics without performing cleanup
 */
export async function getCleanupStats() {
  try {
    const now = new Date();
    const config = RETENTION_CONFIG;
    
    // Count messages that would be cleaned
    const slackOldCount = await db( 
      `SELECT COUNT(*) FROM slack_messages WHERE timestamp < $1`,
      [new Date(now.getTime() - config.slack.maxAgeDays * 24 * 60 * 60 * 1000)]
    );
    
    const teamsOldCount = await db( 
      `SELECT COUNT(*) FROM teams_messages WHERE timestamp < $1`,
      [new Date(now.getTime() - config.teams.maxAgeDays * 24 * 60 * 60 * 1000)]
    );
    
    const whatsappOldCount = await db( 
      `SELECT COUNT(*) FROM whatsapp_messages WHERE timestamp < $1`,
      [new Date(now.getTime() - config.whatsapp.maxAgeDays * 24 * 60 * 60 * 1000)]
    );

    return {
      slack: {
        toClean: parseInt(slackOldCount.rows[0].count),
        retentionHours: config.slack.recentHours,
        yesterdayKeep: config.slack.yesterdayCount
      },
      teams: {
        toClean: parseInt(teamsOldCount.rows[0].count),
        retentionDays: config.teams.maxAgeDays
      },
      whatsapp: {
        toClean: parseInt(whatsappOldCount.rows[0].count),
        retentionDays: config.whatsapp.maxAgeDays
      }
    };
  } catch (error) {
    console.error('❌ Error getting cleanup stats:', error);
    throw error;
  }
}

/**
 * Update retention configuration
 */
export function updateRetentionConfig(platform, newConfig) {
  if (!RETENTION_CONFIG[platform]) {
    throw new Error(`Unknown platform: ${platform}`);
  }
  
  RETENTION_CONFIG[platform] = { ...RETENTION_CONFIG[platform], ...newConfig };
  console.log(`📝 Updated ${platform} retention config:`, RETENTION_CONFIG[platform]);
}

/**
 * Start automatic cleanup job
 * Runs every 30 minutes with error recovery
 */
let cleanupInterval = null;

export function startCleanupJob() {
  console.log('🧹 Starting automatic message cleanup job (runs every 30 minutes)');
  
  // Run immediately on startup
  cleanupOldMessages().catch(error => {
    console.log('❌ Initial cleanup failed:', error.message);
  });
  
  // Run every 30 minutes
  cleanupInterval = setInterval(async () => {
    try {
      await cleanupOldMessages();
    } catch (error) {
      console.log('❌ Scheduled cleanup failed:', error.message);
    }
  }, 30 * 60 * 1000);

  return cleanupInterval;
}

export function stopCleanupJob() {
  if (cleanupInterval) {
    console.log('🛑 Stopping cleanup job...');
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
}
