import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode-terminal';
import { SELECTED_WHATSAPP_GROUPS } from '../config/whatsappGroups.js';
import { query as db } from '../db/index.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { isMutedSenderForGroup } from '../utils/whatsappMute.js';
//whatsappBot.js
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client, LocalAuth, MessageMedia } = pkg;
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "tenant-default";
const INSTANCE_LOCK_NAME = "whatsapp-bot-instance.lock";

function readPidFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8").trim();
    const pid = parseInt(raw, 10);
    return Number.isFinite(pid) ? pid : null;
  } catch {
    return null;
  }
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function formatWhatsAppStartupFailure(error) {
  const msg = error?.message || String(error);
  const chromeProfileDir = path.join(__dirname, "..", ".wwebjs_auth", "session");
  if (msg.includes("browser is already running") || msg.includes("userDataDir")) {
    return [
      "",
      "════════════════════════════════════════════════════════════════",
      " WhatsApp — Chromium profile already in use",
      "────────────────────────────────────────────────────────────────",
      " Another Chromium/Puppeteer process is using:",
      `   ${chromeProfileDir}`,
      "",
      " This backend already clears stale locks on start. If you still see this:",
      "   • Stop any other `node server.js` using this folder, or set WHATSAPP_BOT_ENABLED=false there.",
      "   • Close orphan Chrome only for this profile (we target-kill Chromium using that path).",
      "   • Or set WHATSAPP_PRESTART_KILL_CHROMIUM=false only if you manage Chromium yourself.",
      "",
      ` Technical: ${msg}`,
      "════════════════════════════════════════════════════════════════",
      "",
    ].join("\n");
  }
  return `❌ Failed to start WhatsApp Bot: ${msg}`;
}

function getJinaHeaders() {
  const key = String(process.env.JINA_API_KEY || '').trim();
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
}

function toJinaReaderUrl(rawUrl = '') {
  const clean = String(rawUrl || '').trim();
  if (!/^https?:\/\//i.test(clean)) return null;
  return `https://r.jina.ai/${clean}`;
}

async function readUrlWithJina(rawUrl) {
  const jinaUrl = toJinaReaderUrl(rawUrl);
  if (!jinaUrl) return null;

  try {
    const res = await fetch(jinaUrl, {
      method: 'GET',
      headers: getJinaHeaders(),
      signal: AbortSignal.timeout(Number(process.env.JINA_TIMEOUT_MS || 8000)),
    });
    if (!res.ok) {
      console.warn(`⚠️ Jina read failed (${res.status}) for ${rawUrl}`);
      return null;
    }

    const text = await res.text();
    const normalized = String(text || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return null;
    return normalized.slice(0, Number(process.env.JINA_MAX_CHARS || 2000));
  } catch (err) {
    console.warn(`⚠️ Jina read error for ${rawUrl}: ${err.message}`);
    return null;
  }
}

async function readLinksWithJina(links = []) {
  const unique = [...new Set((links || []).map((u) => String(u || '').trim()).filter(Boolean))];
  if (!unique.length) return [];

  const maxLinks = Number(process.env.JINA_MAX_LINKS_PER_MESSAGE || 2);
  const picked = unique.slice(0, maxLinks);
  const results = await Promise.allSettled(picked.map((url) => readUrlWithJina(url)));
  const reads = [];

  picked.forEach((url, idx) => {
    const item = results[idx];
    if (item.status !== 'fulfilled' || !item.value) return;
    reads.push({ url, content: item.value });
  });

  return reads;
}

function buildJinaContextBlock(reads = []) {
  if (!Array.isArray(reads) || reads.length === 0) return '';
  const contextLines = reads.map((item) => `URL: ${item.url}\nContent: ${item.content}`);
  return `\n\n[URL_CONTEXT_FROM_JINA]\n${contextLines.join('\n\n')}\n[/URL_CONTEXT_FROM_JINA]`;
}

async function saveLinkReads({
  tenantId = DEFAULT_TENANT_ID,
  source = 'whatsapp',
  sourceMessageId = null,
  platformLabel = null,
  sender = null,
  senderHandle = null,
  commentBody = '',
  reads = [],
}) {
  if (!Array.isArray(reads) || reads.length === 0) return;

  for (const item of reads) {
    if (!item?.url || !item?.content) continue;
    try {
      try {
        await db(
          `INSERT INTO link_reads
            (tenant_id, source, source_message_id, platform_label, sender, sender_handle, comment_body, url, read_content)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            tenantId,
            source,
            sourceMessageId,
            platformLabel,
            sender,
            senderHandle,
            commentBody || '',
            item.url,
            item.content,
          ]
        );
      } catch (insertErr) {
        if (insertErr?.code === '23505') {
          await db(
            `UPDATE link_reads
             SET comment_body = $1,
                 read_content = $2,
                 created_at = NOW()
             WHERE tenant_id = $3
               AND source = $4
               AND source_message_id = $5
               AND url = $6`,
            [
              commentBody || '',
              item.content,
              tenantId,
              source,
              sourceMessageId,
              item.url,
            ]
          );
        } else {
          throw insertErr;
        }
      }
    } catch (err) {
      console.warn(`⚠️ Failed to save link read for ${item.url}: ${err.message}`);
    }
  }
}

class WhatsAppBot {
  constructor() {
    this.client = null;
    this.isReady = false;
    this.groups = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.healthCheckInterval = null;
    this.lastHealthCheck = null;
    this.sessionPath = path.join(__dirname, "..", ".wwebjs_auth");
    this.chromeProfilePath = path.join(this.sessionPath, "session");
    this.instanceLockPath = path.join(this.sessionPath, INSTANCE_LOCK_NAME);
    this.qrCode = null;
    this.qrDataUrl = null;
    this.status = 'initializing';
    this.initializeClient();
  }

  isDisabled() {
    return String(process.env.WHATSAPP_BOT_ENABLED || '').toLowerCase() === 'false';
  }

  isNonRecoverableStartupError(error) {
    const message = error?.message || '';
    return error?.code === 'EPERM' || message.includes('spawn EPERM');
  }

  acquireInstanceLock() {
    try {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    } catch (err) {
      console.error("❌ WhatsApp Bot: cannot create session directory:", err.message);
      return false;
    }

    const tryOnce = () => {
      try {
        const fd = fs.openSync(this.instanceLockPath, "wx");
        try {
          fs.writeSync(fd, String(process.pid), "utf8");
        } finally {
          fs.closeSync(fd);
        }
        return true;
      } catch (err) {
        if (err?.code !== "EEXIST") throw err;
        const otherPid = readPidFile(this.instanceLockPath);
        if (otherPid == null) {
          try {
            fs.rmSync(this.instanceLockPath, { force: true });
          } catch {}
          return tryOnce();
        }
        if (otherPid === process.pid) return true;
        if (isProcessAlive(otherPid)) return false;
        try {
          fs.rmSync(this.instanceLockPath, { force: true });
        } catch {}
        return tryOnce();
      }
    };

    try {
      return tryOnce();
    } catch (err) {
      console.error("❌ WhatsApp Bot: instance lock failed:", err.message);
      return false;
    }
  }

  releaseInstanceLock() {
    try {
      const pid = readPidFile(this.instanceLockPath);
      if (pid === process.pid || pid == null) {
        fs.rmSync(this.instanceLockPath, { force: true });
      }
    } catch {}
  }

  removeChromeProfileLockArtifacts() {
    const profileDir = this.chromeProfilePath;
    const lockFiles = [
      path.join(profileDir, "lockfile"),
      path.join(profileDir, "SingletonLock"),
      path.join(profileDir, "SingletonCookie"),
      path.join(profileDir, "SingletonSocket"),
      path.join(profileDir, "DevToolsActivePort"),
    ];
    for (const file of lockFiles) {
      try {
        if (fs.existsSync(file)) fs.rmSync(file, { force: true });
      } catch {}
    }
  }

  async killChromiumForThisProfile() {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    const profileAbs = path.resolve(this.chromeProfilePath);
    try {
      if (process.platform === "win32") {
        const esc = profileAbs.replace(/'/g, "''");
        const ps = [
          "Get-CimInstance Win32_Process | Where-Object {",
          "$_.CommandLine -and $_.CommandLine.Contains('" + esc + "') -and",
          "($_.Name -match '^(chrome|chromium|msedge)\\.exe$')",
          "} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }",
        ].join(" ");
        await execFileAsync(
          "powershell.exe",
          ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-Command", ps],
          { timeout: 45000, windowsHide: true }
        );
      } else {
        const pattern = profileAbs.replace(/'/g, "'\\''");
        await execFileAsync("sh", ["-c", `pkill -f '${pattern}' || true`], { timeout: 45000 });
      }
    } catch {
      /* best-effort */
    }
  }

  async preSessionCleanup() {
    this.removeChromeProfileLockArtifacts();
    const skipKill = String(process.env.WHATSAPP_PRESTART_KILL_CHROMIUM || "true").toLowerCase() === "false";
    if (!skipKill) {
      await this.killChromiumForThisProfile();
      await new Promise((r) => setTimeout(r, 500));
      this.removeChromeProfileLockArtifacts();
    }
  }

  initializeClient() {
    const isWin = process.platform === 'win32';
    const baseArgs = isWin
      ? [
          '--disable-gpu',
          '--disable-dev-shm-usage',
          '--no-first-run',
        ]
      : [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-first-run',
          '--no-zygote',
        ];

    const executablePath =
      process.env.PUPPETEER_EXECUTABLE_PATH ||
      process.env.CHROME_PATH ||
      undefined;

    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: this.sessionPath }),
      puppeteer: {
        headless: true,
        args: baseArgs,
        ...(executablePath ? { executablePath } : {}),
      }
    });
    this.setupEventHandlers();
  }

  // ─── Save base64 media to temp folder ────────────────────────────────────
  saveMediaToTemp(base64Data, mimetype, filename) {
    try {
      const ext = mimetype?.split('/')[1]?.split(';')[0] || 'jpg';
      const safeName = `${Date.now()}_${(filename || 'whatsapp_media').replace(/[^a-zA-Z0-9._-]/g, '_')}.${ext}`;
      const tempDir = path.join(__dirname, '..', 'public', 'temp');
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      const buffer = Buffer.from(base64Data, 'base64');
      fs.writeFileSync(path.join(tempDir, safeName), buffer);
      const publicUrl = `http://localhost:${process.env.PORT || 5000}/temp/${safeName}`;
      console.log(`📎 WhatsApp media saved: ${publicUrl}`);
      return publicUrl;
    } catch (err) {
      console.error('❌ Failed to save WhatsApp media:', err.message);
      return null;
    }
  }

  // ─── Generate QR as base64 PNG data URL ──────────────────────────────────
  async generateQRDataUrl(qr) {
    try {
      const { default: QRCode } = await import('qrcode');
      this.qrDataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
    } catch {
      this.qrDataUrl = null;
    }
  }

  setupEventHandlers() {
    this.client.on('qr', async (qr) => {
      console.log('📱 WhatsApp QR Code generated — scan to connect');
      qrcode.generate(qr, { small: true });
      this.qrCode = qr;
      this.status = 'qr';
      await this.generateQRDataUrl(qr);
    });

    this.client.on('ready', async () => {
      console.log('✅ WhatsApp Bot is ready!');
      this.isReady = true;
      this.qrCode = null;
      this.qrDataUrl = null;
      this.status = 'ready';
      this.reconnectAttempts = 0;
      this.lastHealthCheck = new Date();
      try {
        await this.loadGroups();
        this.startHealthCheck();
      } catch (error) {
        console.error('❌ Error during ready setup:', error);
      }
    });

    this.client.on('authenticated', () => {
      console.log('✅ WhatsApp Bot authenticated successfully');
      this.qrCode = null;
      this.qrDataUrl = null;
      this.status = 'authenticated';
    });

    this.client.on('auth_failure', (msg) => {
      console.error('❌ WhatsApp authentication failed:', msg);
      this.isReady = false;
      this.status = 'disconnected';
      this.scheduleReconnect();
    });

    this.client.on('disconnected', (reason) => {
      console.log('❌ WhatsApp Bot disconnected:', reason);
      this.isReady = false;
      this.status = 'disconnected';
      this.stopHealthCheck();
      this.scheduleReconnect();
    });

    this.client.on('loading_screen', (percent, message) => {
      console.log(`⏳ WhatsApp loading: ${percent}% - ${message}`);
    });

    // ─── Single message handler — inbound only ────────────────────────────
    this.client.on('message', async (message) => {
      this.lastHealthCheck = new Date();

      if (message.from.includes('status@broadcast')) return;
      if (message.fromMe) return;

      try {
        const chat = await message.getChat();
        if (!chat.isGroup) return;

        const groupName = chat.name;
        if (!SELECTED_WHATSAPP_GROUPS.includes(groupName)) {
          console.log(`🚫 Ignored group "${groupName}"`);
          return;
        }

        const contact = await message.getContact().catch(() => null);
        const senderName = contact?.pushname || contact?.name || 'Unknown';
        const senderHandle = (message.author || message.from || '').trim();

        console.log(`📱 WhatsApp: ${senderName} in "${groupName}"`);

        // ─── Handle direct media ──────────────────────────────────────
        const mediaUrls = [];
        const hasMedia = message.hasMedia || ['image', 'video', 'document', 'sticker'].includes(message.type);
        if (hasMedia) {
          try {
            const media = await message.downloadMedia();
            if (media?.data) {
              const { uploadImageBuffer } = await import('../services/storageService.js');
              const buffer = Buffer.from(media.data, 'base64');
              const filename = media.filename || `whatsapp_${Date.now()}.jpg`;
              const contentType = media.mimetype || 'image/jpeg';
              const publicUrl = await uploadImageBuffer(buffer, filename, contentType);
              if (publicUrl) {
                mediaUrls.push(publicUrl);
                console.log(`✅ WhatsApp media uploaded to Supabase: ${publicUrl}`);
              } else {
                console.warn('⚠️ Failed to upload WhatsApp media: No public URL returned');
              }
            }
          } catch (mediaErr) {
            console.error('❌ Failed to upload WhatsApp media:', mediaErr.message);
          }
        }

        // ─── Handle quoted message ────────────────────────────────────
        if (message.hasQuotedMsg) {
          try {
            const quoted = await message.getQuotedMessage();

            // Capture quoted text — append to body for context
            if (quoted.body) {
              message.body = `${message.body || ''}\n[Quoted: ${quoted.body}]`;
            }

            // Capture quoted media
            if (quoted.hasMedia) {
              const media = await quoted.downloadMedia();
              if (media?.data) {
                const { uploadImageBuffer } = await import('../services/storageService.js');
                const buffer = Buffer.from(media.data, 'base64');
                const filename = media.filename || `whatsapp_quoted_${Date.now()}.jpg`;
                const contentType = media.mimetype || 'image/jpeg';
                const publicUrl = await uploadImageBuffer(buffer, filename, contentType);
                if (publicUrl) {
                  mediaUrls.push(publicUrl);
                  console.log(`📎 Quoted media saved: ${publicUrl}`);
                }
              }
            }
          } catch (quotedErr) {
            console.warn(`⚠️ Could not process quoted message: ${quotedErr.message}`);
          }
        }

        // ─── Save to DB ───────────────────────────────────────────────
        const result = await db(
          `INSERT INTO whatsapp_messages 
            (tenant_id, sender, sender_phone, body, timestamp, media_urls, direction, group_name)
           VALUES ($1, $2, $3, $4, $5, $6, 'inbound', $7)
           RETURNING id`,
          [DEFAULT_TENANT_ID, senderName, senderHandle || message.from, message.body || '', new Date().toISOString(), JSON.stringify(mediaUrls), groupName]
        );

        const messageId = result.rows[0]?.id;
        console.log(`💾 Saved WhatsApp message (id: ${messageId}) [inbound]`);

        const mutedSender = isMutedSenderForGroup(senderName, groupName, senderHandle);
        if (mutedSender && messageId) {
          await db(
            `UPDATE whatsapp_messages
             SET batch_scanned = TRUE,
                 ai_should_forward = FALSE,
                 ai_category = 'muted_sender',
                 ai_priority = 'low',
                 ai_reason = 'Muted sender in this group by user rule'
             WHERE id = $1`,
            [messageId]
          ).catch(() => {});
          console.log(`🔇 Muted sender rule applied for "${senderName}" in "${groupName}"`);
          return;
        }

        // ─── Auto-summarize ───────────────────────────────────────────
        if (groupName && messageId) {
          fetch(`http://localhost:8000/summarize/whatsapp/${encodeURIComponent(groupName)}`, {
            method: 'POST',
          }).catch(() => {});
        }

        // ─── Task detection ───────────────────────────────────────────
        const links = (message.body || '').match(/https?:\/\/[^\s<>"{}|\\^`\[\]]+/g) || [];
        let enrichedBody = message.body || '';
        let jinaReads = [];
        if (links.length > 0) {
          jinaReads = await readLinksWithJina(links);
          const jinaContext = buildJinaContextBlock(jinaReads);
          if (jinaContext) {
            enrichedBody = `${enrichedBody}${jinaContext}`;
          }
        }
        if (jinaReads.length > 0) {
          await saveLinkReads({
            tenantId: DEFAULT_TENANT_ID,
            source: 'whatsapp',
            sourceMessageId: messageId,
            platformLabel: groupName,
            sender: senderName,
            senderHandle: senderHandle || message.from,
            commentBody: message.body || '',
            reads: jinaReads,
          });
        }
        if ((links.length > 0 || mediaUrls.length > 0) && SELECTED_WHATSAPP_GROUPS.includes(groupName)) {
          fetch(`http://localhost:${process.env.PORT || 5000}/api/tasks/detect`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source: 'whatsapp',
              source_message_id: messageId,
              client_name: senderName,
              platform_label: groupName,
              body: enrichedBody,
              images: mediaUrls,
            }),
          }).catch(() => {});
        }

        // ─── OpenClaw AI analysis ─────────────────────────────────────
        if ((message.body && message.body.trim()) || mediaUrls.length > 0) {
          const { runAgentAnalysis } = await import('../agent/openclawAgent.js');
          runAgentAnalysis({
            source: 'whatsapp',
            sender: senderName,
            content: (enrichedBody && enrichedBody.trim()) ? enrichedBody : '[media-only message]',
            messageId,
            mediaUrls,
          }).catch(err => console.error('OpenClaw error:', err.message));
        }

      } catch (error) {
        console.error('❌ Error processing WhatsApp message:', error.message);
      }
    });
  }

  async start() {
    if (this.isDisabled()) {
      this.status = 'disabled';
      console.log('WhatsApp Bot disabled by WHATSAPP_BOT_ENABLED=false');
      return;
    }
    try {
      if (!this.acquireInstanceLock()) {
        this.status = 'duplicate_instance';
        console.error(
          `❌ WhatsApp Bot skipped: another backend process already owns this session (see ${this.instanceLockPath}). ` +
            "Stop the other Node server using this profile, or set WHATSAPP_BOT_ENABLED=false on this instance."
        );
        return;
      }
      await this.preSessionCleanup();
      console.log('🚀 Starting WhatsApp Bot...');
      const sessionExists = fs.existsSync(this.sessionPath);
      console.log(`📁 Session exists: ${sessionExists}`);
      await this.client.initialize();
    } catch (error) {
      console.error(formatWhatsAppStartupFailure(error));
      await this.handleStartupError(error);
    }
  }

  async handleStartupError(error) {
    if (this.isNonRecoverableStartupError(error)) {
      this.status = 'error';
      console.error('WhatsApp Bot cannot start in this environment. Automatic retries disabled.');
      return;
    }
    if (error.message.includes('browser is already running') || error.message.includes('Session timed out')) {
      try {
        await this.forceCleanup();
        await new Promise(resolve => setTimeout(resolve, 3000));
        this.initializeClient();
        await this.client.initialize();
      } catch (retryError) {
        console.error('❌ Failed to recover:', retryError);
        // If Chromium profile lock persists, do a hard LocalAuth reset so bot can
        // come back with a fresh QR flow instead of staying stuck on startup.
        try {
          await this.resetSession();
        } catch (resetError) {
          console.error('❌ Failed to reset session after startup lock:', resetError);
          this.scheduleReconnect();
        }
      }
    } else {
      this.scheduleReconnect();
    }
  }

  async forceCleanup() {
    try {
      if (this.client) await this.client.destroy();
      this.removeChromeProfileLockArtifacts();
      await this.killChromiumForThisProfile();
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.removeChromeProfileLockArtifacts();
      console.log('🧹 Force cleanup completed');
    } catch (error) {
      console.error('❌ Force cleanup error:', error);
    }
  }

  async resetSession() {
    console.log('🔄 Resetting WhatsApp session...');
    try {
      this.stopHealthCheck();
      this.isReady = false;
      this.status = 'initializing';
      this.groups.clear();
      this.qrCode = null;
      this.qrDataUrl = null;

      if (this.client) {
        try { await this.client.destroy(); } catch {}
      }

      if (fs.existsSync(this.sessionPath)) {
        fs.rmSync(this.sessionPath, { recursive: true, force: true });
        console.log('🗑️ Session deleted');
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
      this.reconnectAttempts = 0;
      this.initializeClient();
      await this.client.initialize();
      console.log('✅ Session reset — waiting for QR scan');
      return { success: true, message: 'Session reset. Scan the new QR code.' };
    } catch (err) {
      console.error('❌ Reset session error:', err.message);
      throw err;
    }
  }

  scheduleReconnect() {
    if (this.isDisabled()) return;
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached.');
      return;
    }
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`🔄 Reconnecting in ${delay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    setTimeout(async () => {
      try { await this.restart(); } catch (error) {
        console.error('❌ Reconnection failed:', error);
        this.scheduleReconnect();
      }
    }, delay);
  }

  startHealthCheck() {
    this.stopHealthCheck();
    this.healthCheckInterval = setInterval(async () => {
      try {
        if (!this.isReady) return;
        const now = new Date();
        if (now - this.lastHealthCheck > 10 * 60 * 1000) {
          const state = await this.client.getState();
          if (state === 'CONNECTED') { this.lastHealthCheck = now; }
          else { this.isReady = false; this.scheduleReconnect(); }
        }
      } catch { this.isReady = false; this.scheduleReconnect(); }
    }, 60000);
  }

  stopHealthCheck() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async restart() {
    this.isReady = false;
    this.groups.clear();
    this.stopHealthCheck();
    await this.forceCleanup();
    await new Promise(resolve => setTimeout(resolve, 2000));
    this.initializeClient();
    await this.client.initialize();
    console.log('✅ WhatsApp Bot restarted');
    return { success: true };
  }

  async loadGroups() {
    if (!this.isReady) throw new Error('Bot is not ready');
    const chats = await this.client.getChats();
    const allGroups = chats.filter(chat => chat.isGroup);
    const selectedGroups = allGroups.filter(g => SELECTED_WHATSAPP_GROUPS.includes(g.name));
    this.groups.clear();
    selectedGroups.forEach(group => {
      this.groups.set(group.name, {
        id: group.id._serialized,
        name: group.name,
        participants: group.participants?.length || 0,
        lastSeen: new Date()
      });
    });
    console.log(`✅ Loaded ${this.groups.size} WhatsApp groups`);
    return Array.from(this.groups.values());
  }

  /** E.164 or local digits → whatsapp-web.js chat id */
  phoneToChatId(phone) {
    const digits = String(phone || "").replace(/\D/g, "");
    if (digits.length < 8) throw new Error(`Invalid phone for WhatsApp send: "${phone}"`);
    return `${digits}@c.us`;
  }

  /**
   * Send text or media to an individual chat (phone number).
   * Use for Teams→WhatsApp / API when channel_mappings.whatsapp_number is a phone.
   */
  async sendToPhone(phone, message, mediaUrl = null, retries = 3) {
    if (this.isDisabled()) throw new Error("WhatsApp Bot is disabled");
    if (!this.isReady) throw new Error("WhatsApp Bot is not ready");
    const chatId = this.phoneToChatId(phone);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (mediaUrl) {
          const response = await fetch(mediaUrl);
          if (!response.ok) throw new Error(`Failed to fetch media: HTTP ${response.status}`);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString("base64");
          const contentType = response.headers.get("content-type") || "image/jpeg";
          const media = new MessageMedia(contentType, base64);
          await this.client.sendMessage(chatId, media, { caption: message || "" });
          console.log(`✅ Media sent to phone ${phone}`);
        } else {
          await this.client.sendMessage(chatId, message);
          console.log(`✅ Message sent to phone ${phone}`);
        }
        return { success: true, phone, chatId };
      } catch (error) {
        console.error(`❌ sendToPhone attempt ${attempt}/${retries} failed: ${error.message}`);
        if (attempt === retries) throw error;
        await new Promise((r) => setTimeout(r, 1000 * attempt));
      }
    }
  }

  // ─── Send message or image+caption to a WhatsApp group ───────────────────
  async sendToGroup(groupName, message, mediaUrl = null, retries = 3) {
    if (!this.isReady) throw new Error('WhatsApp Bot is not ready');
    if (!this.groups.has(groupName)) await this.loadGroups();
    const targetGroup = this.groups.get(groupName);
    if (!targetGroup) throw new Error(`Group "${groupName}" not found`);

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        if (mediaUrl) {
          const response = await fetch(mediaUrl);
          if (!response.ok) throw new Error(`Failed to fetch media: HTTP ${response.status}`);
          const buffer = await response.arrayBuffer();
          const base64 = Buffer.from(buffer).toString('base64');
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          const media = new MessageMedia(contentType, base64);
          await this.client.sendMessage(targetGroup.id, media, { caption: message || '' });
          console.log(`✅ Image with caption sent to "${targetGroup.name}"`);
        } else {
          await this.client.sendMessage(targetGroup.id, message);
          console.log(`✅ Message sent to "${targetGroup.name}"`);
        }
        targetGroup.lastSeen = new Date();
        return { success: true, groupName, groupId: targetGroup.id, attempt };
      } catch (error) {
        console.error(`❌ Send attempt ${attempt}/${retries} failed for "${groupName}": ${error.message}`);
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }

  async getGroups() {
    if (!this.isReady) return [];
    try {
      if (this.groups.size === 0) await this.loadGroups();
      return Array.from(this.groups.values());
    } catch { return []; }
  }

  getQR()        { return this.qrCode; }
  getQRDataUrl() { return this.qrDataUrl; }

  getStatus() {
    return {
      status: this.status,
      connected: this.isReady,
      duplicateInstance: this.status === "duplicate_instance",
      groupsLoaded: this.groups.size,
      reconnectAttempts: this.reconnectAttempts,
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  isConnected() { return this.isReady; }

  async destroy() {
    try {
      console.log('🤖 Destroying WhatsApp Bot...');
      this.stopHealthCheck();
      this.isReady = false;
      if (this.client) {
        await this.client.destroy();
      }
      console.log('✅ WhatsApp Bot destroyed');
    } catch (error) {
      console.error('❌ Error destroying WhatsApp bot:', error.message);
    }
    this.releaseInstanceLock();
  }
}

const whatsappBot = new WhatsAppBot();
export default whatsappBot;
export { WhatsAppBot };