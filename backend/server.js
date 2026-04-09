import dotenv from "dotenv";

dotenv.config();
//server.js is the main entry point for the Express server. It sets up middleware, routes, and background jobs for the Unified Hub application. It also includes feature flags to enable or disable certain functionalities like message cleanup, WhatsApp bot, and background scanning. The server listens on a specified port and initializes necessary services on startup.
import express from "express";
import cors from "cors";
import session from "express-session";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

import { subscribeToAll, startRenewalIntervalStatus, stopRenewalInterval } from "./services/teamsSubscription.js";
import { startCleanupJob, stopCleanupJob } from "./services/messageCleanup.js";
import whatsappBot from "./services/whatsappBot.js";
import { adapter } from "./services/teamsService.js";
import { UnifiedHubBot } from "./agent/teamsBot.js";
import conversationStore from "./services/conversationStore.js";
import { runAgentAnalysis } from "./agent/openclawAgent.js";
import { query } from "./db/index.js";

import teamsWebhookRoute from "./routes/teamsWebhook.js";
import adminRoutes from "./routes/adminRoutes.js";
import teamsRoutes from "./routes/teamsRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import teamsApiRoutes from "./routes/teamsApiRoutes.js";
import whatsappRoutes from "./routes/whatsappRoutes.js";
import slackRoutes from "./routes/slackRoutes.js";
import dismissRoutes from "./routes/dismissRoutes.js";
import whatsappBotRoutes from "./routes/whatsappBotRoutes.js";
import cleanupRoutes from "./routes/cleanupRoutes.js";
import taskRoutes, { initTasksTable } from "./routes/taskRoutes.js";
import monitoringRoutes from "./routes/monitoringRoutes.js";
import fileProxyRoutes from "./routes/fileProxyRoutes.js";
import summaryRoutes from "./routes/summaryRoutes.js";
import forwardLogRoutes from './routes/forwardLogRoutes.js';
import scanRoutes from './routes/scanRoutes.js';
import settingsRoutes from "./routes/settingsRoutes.js";
import { startWhatsAppGroupTracker, stopWhatsAppGroupTracker } from './services/whatsappGroupTracker.js';
import { startSlackBatchScanner, stopSlackBatchScanner } from './services/slackBatchScanner.js';
import { startRetryService, stopRetryService } from './services/retryForwards.js';
import { tenantContext } from "./middleware/tenantContext.js";
import { startTaskReminderService, stopTaskReminderService } from "./services/taskReminderService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function isFeatureEnabled(name, defaultValue = true) {
  const value = process.env[name];
  if (value == null || value === "") return defaultValue;
  return String(value).toLowerCase() !== "false";
}

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://localhost:3003",
  ],
  credentials: true,
}));

app.use((req, res, next) => {
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "unsafe-none");
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(tenantContext);
app.use(session({
  secret: "unifiedhub-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true },
}));

const tempDir = path.join(__dirname, "public", "temp");
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}
app.use("/temp", express.static(tempDir));

app.use("/api/auth", authRoutes);
app.use("/api/webhook", teamsWebhookRoute);
app.use("/api/messages", adminRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/teams", teamsRoutes);
app.use("/api/teams", teamsApiRoutes);
app.use("/api/whatsapp", whatsappRoutes);
app.use("/api", settingsRoutes);
app.use("/api/slack", slackRoutes);
app.use("/api/dismiss", dismissRoutes);
app.use("/api/whatsapp-bot", whatsappBotRoutes);
app.use("/api/cleanup", cleanupRoutes);
app.use("/api/monitoring", monitoringRoutes);
app.use("/api/files", fileProxyRoutes);
app.use("/api/summaries", summaryRoutes);
app.use('/api/forward-logs', forwardLogRoutes);
app.use('/api/scan', scanRoutes);
app.use("/api/slack-batch", slackRoutes);

// ─── Link Preview API ────────────────────────────────────────────────────────
app.get("/api/link-preview", async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: "URL is required" });

  try {
    const fetch = (await import("node-fetch")).default;
    const response = await fetch(url, { 
      timeout: 3000, 
      headers: { "User-Agent": "OpenClaw-Bot/1.0" } 
    });
    if (!response.ok) throw new Error("Failed to fetch");
    
    const html = await response.text();
    const getMeta = (prop) => {
      const regex = new RegExp(`<meta [^>]*property=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i");
      const match = html.match(regex);
      if (match) return match[1];
      const nameRegex = new RegExp(`<meta [^>]*name=["']${prop}["'][^>]*content=["']([^"']*)["']`, "i");
      const nameMatch = html.match(nameRegex);
      return nameMatch ? nameMatch[1] : null;
    };

    const title = getMeta("og:title") || getMeta("twitter:title") || html.match(/<title>([^<]*)<\/title>/i)?.[1] || url;
    const image = getMeta("og:image") || getMeta("twitter:image");
    const description = getMeta("og:description") || getMeta("description") || getMeta("twitter:description");

    res.json({ title, image, description, url });
  } catch (err) {
    res.status(500).json({ error: err.message, url });
  }
});

const teamsBot = new UnifiedHubBot(conversationStore);
app.post("/api/bot/messages", async (req, res) => {
  await adapter.processActivity(req, res, async (context) => {
    await teamsBot.run(context);
  });
});

async function reanalyzeFailedMessages() {
  try {
    const { rows } = await query(
      `SELECT id, sender, body
       FROM teams_messages
       WHERE (ai_reasoning IS NULL OR ai_reasoning = '')
         AND approval_status = 'waiting'
       ORDER BY timestamp DESC
       LIMIT 20`
    );

    if (rows.length === 0) return;

    console.log(`Re-analyzing ${rows.length} messages...`);
    for (const msg of rows) {
      try {
        await runAgentAnalysis({
          source: "teams",
          sender: msg.sender,
          content: msg.body,
          messageId: msg.id,
        });
      } catch (loopErr) {
        console.error(`❌ Failed to re-analyze message ${msg.id}:`, loopErr.message);
      }
    }
    console.log("Re-analysis complete");
  } catch (err) {
    console.error("Re-analysis error:", err.message);
  }
}

async function runMigrations() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS tenants (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(
      `INSERT INTO tenants (id, name, slug)
       VALUES ($1, $2, $3)
       ON CONFLICT (slug) DO NOTHING`,
      [
        process.env.DEFAULT_TENANT_ID || "tenant-default",
        process.env.DEFAULT_TENANT_NAME || "Default Tenant",
        process.env.DEFAULT_TENANT_SLUG || "default",
      ]
    );

    await initTasksTable();
    await query(`
      CREATE TABLE IF NOT EXISTS forward_logs (
        id SERIAL PRIMARY KEY,
        source TEXT,
        destination TEXT,
        source_channel TEXT,
        dest_channel TEXT,
        message_preview TEXT,
        status TEXT,
        error_reason TEXT,
        forwarded_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`ALTER TABLE forward_logs ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0`);
    await query(`ALTER TABLE forward_logs ADD COLUMN IF NOT EXISTS last_retried_at TIMESTAMPTZ`);
    await query(`ALTER TABLE forward_logs ADD COLUMN IF NOT EXISTS card_content TEXT`);
    await query(`ALTER TABLE forward_logs ADD COLUMN IF NOT EXISTS teams_chat_id TEXT`);
    await query(`ALTER TABLE forward_logs ADD COLUMN IF NOT EXISTS teams_chat_name TEXT`);
    await query(`ALTER TABLE forward_logs ADD COLUMN IF NOT EXISTS group_name TEXT`);
    await query(`ALTER TABLE forward_logs ADD COLUMN IF NOT EXISTS failure_reason TEXT`);
    await query(`ALTER TABLE forward_logs ADD COLUMN IF NOT EXISTS sender TEXT`);
    await query(`ALTER TABLE forward_logs ADD COLUMN IF NOT EXISTS message_preview TEXT`);
    await query(`ALTER TABLE teams_messages ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT FALSE`);
    await query(`ALTER TABLE slack_messages ADD COLUMN IF NOT EXISTS files JSONB DEFAULT '[]'::jsonb`);
    await query(`ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS batch_scanned BOOLEAN DEFAULT FALSE`);
    await query(`
      CREATE TABLE IF NOT EXISTS whatsapp_batch_tasks (
        id SERIAL PRIMARY KEY,
        group_name TEXT,
        task_title TEXT,
        description TEXT,
        category TEXT,
        priority TEXT,
        files JSONB DEFAULT '[]',
        links JSONB DEFAULT '[]',
        teams_chat_id TEXT,
        forwarded BOOLEAN DEFAULT FALSE,
        scanned_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS slack_threads (
        thread_id TEXT PRIMARY KEY,
        channel_id TEXT NOT NULL,
        channel_name TEXT,
        summary TEXT,
        client_reply_count INTEGER DEFAULT 0,
        last_processed_ts TEXT,
        forwarded_at_counts JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const tenantTables = [
      "users",
      "channel_mappings",
      "teams_conversations",
      "teams_messages",
      "slack_messages",
      "whatsapp_messages",
      "tasks",
      "forward_logs",
      "client_history",
      "whatsapp_batch_tasks",
      "slack_threads",
    ];
    for (const table of tenantTables) {
      await query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS tenant_id TEXT`);
      await query(
        `UPDATE ${table}
         SET tenant_id = $1
         WHERE tenant_id IS NULL`,
        [process.env.DEFAULT_TENANT_ID || "tenant-default"]
      );
    }

    await query(`CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id)`);
    await query(`ALTER TABLE channel_mappings ADD COLUMN IF NOT EXISTS whatsapp_group_name TEXT`);
    await query(
      `COMMENT ON COLUMN channel_mappings.whatsapp_group_name IS 'Exact WhatsApp group title (matches whatsapp_messages.group_name and SELECTED_WHATSAPP_GROUPS)'`
    );
    await query(`CREATE INDEX IF NOT EXISTS idx_channel_mappings_tenant_id ON channel_mappings(tenant_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_teams_conversations_tenant_id ON teams_conversations(tenant_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_teams_messages_tenant_id_ts ON teams_messages(tenant_id, timestamp DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_slack_messages_tenant_id_ts ON slack_messages(tenant_id, timestamp DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_tenant_id_ts ON whatsapp_messages(tenant_id, timestamp DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id_created ON tasks(tenant_id, created_at DESC)`);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS teams_activity_id TEXT`);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS teams_conversation_id TEXT`);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ`);
    await query(`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_by TEXT`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_activity ON tasks(tenant_id, teams_activity_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status_created ON tasks(tenant_id, status, created_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_forward_logs_tenant_id_status ON forward_logs(tenant_id, status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_client_history_tenant_source_group ON client_history(tenant_id, source, group_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_whatsapp_batch_tasks_tenant_id ON whatsapp_batch_tasks(tenant_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_slack_threads_tenant_id ON slack_threads(tenant_id)`);
    console.log("DB migrations complete");
  } catch (err) {
    console.error("Migration error:", err.message);
  }
}

function startBackgroundScanner() {
  if (!isFeatureEnabled("BACKGROUND_SCANNER_ENABLED")) {
    console.log("Background scanner disabled by BACKGROUND_SCANNER_ENABLED=false");
    return null;
  }

  return setInterval(async () => {
    try {
      const { rows: tenants } = await query(`SELECT id FROM tenants`);
      for (const tenant of tenants) {
        const { rows } = await query(
          `SELECT id, body, files
           FROM slack_messages
           WHERE tenant_id = $1
             AND (dismissed IS NULL OR dismissed = FALSE)
             AND (forwarded_to_teams IS NULL OR forwarded_to_teams = FALSE)
             AND timestamp >= NOW() - INTERVAL '1 day'
             AND (body ~ 'https?://' OR (files IS NOT NULL AND files != '[]'))
           LIMIT 10`,
          [tenant.id]
        );

        for (const msg of rows) {
          const files = (() => {
            try { return JSON.parse(msg.files || "[]"); } catch { return []; }
          })();

          fetch(`http://localhost:${process.env.PORT || 5000}/api/tasks/detect`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-tenant-id": tenant.id },
            body: JSON.stringify({
              source: "slack",
              source_message_id: msg.id,
              body: msg.body,
              images: files.map((file) => file.publicUrl || file.url).filter(Boolean),
            }),
          }).catch(() => {});
        }
      }
    } catch {}
  }, 60000);
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);

  if (isFeatureEnabled("DB_MIGRATIONS_ENABLED")) {
    await runMigrations();
  } else {
    console.log("DB migrations disabled by DB_MIGRATIONS_ENABLED=false");
  }

  if (isFeatureEnabled("MESSAGE_CLEANUP_ENABLED")) {
    startCleanupJob();
  } else {
    console.log("Message cleanup disabled by MESSAGE_CLEANUP_ENABLED=false");
  }

  startBackgroundScanner();

  // ── WhatsApp 30-min batch task scanner ───────────────────────────────────
  if (isFeatureEnabled("WHATSAPP_BATCH_SCANNER_ENABLED")) {
    startWhatsAppGroupTracker();
  } else {
    console.log("WhatsApp batch scanner disabled by WHATSAPP_BATCH_SCANNER_ENABLED=false");
  }

  // ── Slack 30-min batch scanner ────────────────────────────────────────────
  if (isFeatureEnabled("SLACK_BATCH_SCANNER_ENABLED")) {
    startSlackBatchScanner();
  } else {
    console.log("Slack batch scanner disabled by SLACK_BATCH_SCANNER_ENABLED=false"); 
  }

  if (isFeatureEnabled("WHATSAPP_BOT_ENABLED")) {
    console.log("Starting WhatsApp Bot...");
    whatsappBot.start();
  } else {
    console.log("WhatsApp bot disabled by WHATSAPP_BOT_ENABLED=false");
  }

  // ── Retry failed forwards ─────────────────────────────────────────────────
  if (isFeatureEnabled("RETRY_FORWARDS_ENABLED")) {
    startRetryService();
  } else {
    console.log("Retry service disabled by RETRY_FORWARDS_ENABLED=false");
  }

  if (isFeatureEnabled("TASK_REMINDERS_ENABLED", true)) {
    startTaskReminderService();
  } else {
    console.log("Task reminder service disabled by TASK_REMINDERS_ENABLED=false");
  }

  if (isFeatureEnabled("TEAMS_SUBSCRIPTIONS_ENABLED")) {
    try {
      await subscribeToAll();
      startRenewalIntervalStatus();
    } catch (err) {
      console.error("Failed to setup subscriptions:", err.message);
    }
  } else {
    console.log("Teams subscriptions disabled by TEAMS_SUBSCRIPTIONS_ENABLED=false");
  }

  if (isFeatureEnabled("REANALYZE_MESSAGES_ENABLED")) {
    setTimeout(reanalyzeFailedMessages, 5000);
  } else {
    console.log("Message re-analysis disabled by REANALYZE_MESSAGES_ENABLED=false");
  }
});

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
async function gracefulShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  try {
    stopCleanupJob();
    stopWhatsAppGroupTracker();
    stopSlackBatchScanner();
    stopRetryService();
    stopTaskReminderService();
    stopRenewalInterval();
    
    if (isFeatureEnabled("WHATSAPP_BOT_ENABLED")) {
      await whatsappBot.destroy();
    }
  } catch (err) {
    console.error("Error during graceful shutdown:", err.message);
  }
  
  console.log("👋 Graceful shutdown complete. Exiting process.");
  setTimeout(() => process.exit(0), 1000); // Small delay to allow logs to flush
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));

// ─── Global Error Handlers ───────────────────────────────────────────────────
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error.message);
  console.error(error.stack);
  // Keep the process alive for now, but log the error
});


