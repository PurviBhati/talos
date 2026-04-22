import dotenv from "dotenv";
//teamsSubscription.js - manages Microsoft Graph API subscriptions for Teams message notifications, including setup, renewal, and cleanup logic
dotenv.config();

import { getAccessToken } from "./graphservice.js";

function subscriptionsEnabled() {
  return String(process.env.TEAMS_SUBSCRIPTIONS_ENABLED || "").toLowerCase() !== "false";
}

function getNotificationUrl() {
  const base = String(process.env.NGROK_URL || "").replace(/\/$/, "");
  return `${base}/api/webhook/webhook`;
}

function getServerPort() {
  return String(process.env.PORT || 5000).trim() || "5000";
}

const publicFetchHeaders = {
  Accept: "text/plain",
  "User-Agent": "UnifiedHub-TeamsWebhookPreflight/1.0",
  "ngrok-skip-browser-warning": "69420",
};

function logPreflightBanner(title, lines) {
  console.warn("");
  console.warn("════════════════════════════════════════════════════════════════");
  console.warn(` ${title}`);
  console.warn("────────────────────────────────────────────────────────────────");
  for (const line of lines) {
    for (const chunk of String(line).split("\n")) {
      console.warn(` ${chunk}`);
    }
  }
  console.warn("════════════════════════════════════════════════════════════════");
  console.warn("");
}

async function verifyLocalWebhookResponds() {
  const token = `local-preflight-${Date.now()}`;
  const url = `http://127.0.0.1:${getServerPort()}/api/webhook/webhook?validationToken=${encodeURIComponent(token)}`;
  const timeoutMs = Math.max(3000, Number(process.env.GRAPH_LOCAL_PREFLIGHT_TIMEOUT_MS || 8000));
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: ac.signal,
      headers: { Accept: "text/plain" },
    });
    clearTimeout(t);
    const body = (await res.text()).trim();
    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status} from ${url}` };
    }
    if (body !== token) {
      return { ok: false, reason: "validation echo mismatch on localhost (route or middleware blocking)" };
    }
    return { ok: true };
  } catch (err) {
    clearTimeout(t);
    const msg = err?.name === "AbortError" ? `timed out after ${timeoutMs}ms` : err?.message || String(err);
    return { ok: false, reason: msg };
  }
}

async function verifyPublicWebhookReachable(options = {}) {
  const attempts = Math.max(
    1,
    Number(
      options.attempts != null ? options.attempts : parseInt(String(process.env.GRAPH_WEBHOOK_PREFLIGHT_ATTEMPTS || "4"), 10)
    )
  );
  const delayMs = Math.max(
    200,
    Number(
      options.delayMs != null ? options.delayMs : parseInt(String(process.env.GRAPH_WEBHOOK_PREFLIGHT_DELAY_MS || "2000"), 10)
    )
  );
  const connectTimeoutMs = Math.max(
    5000,
    Number(
      options.timeoutMs != null ? options.timeoutMs : parseInt(String(process.env.GRAPH_WEBHOOK_PREFLIGHT_TIMEOUT_MS || "25000"), 10)
    )
  );
  const silent = Boolean(options.silent);

  const base = String(process.env.NGROK_URL || "").replace(/\/$/, "");
  if (!base) {
    return { ok: false, reason: "NGROK_URL is empty", kind: "config" };
  }
  const token = `graph-preflight-${Date.now()}`;
  const url = `${base}/api/webhook/webhook?validationToken=${encodeURIComponent(token)}`;

  let lastReason = "unknown";

  for (let i = 0; i < attempts; i++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), connectTimeoutMs);
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "manual",
        signal: ac.signal,
        headers: publicFetchHeaders,
      });
      clearTimeout(timer);
      const body = (await res.text()).trim();
      if (!res.ok) {
        lastReason = `HTTP ${res.status} from public URL`;
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        return { ok: false, reason: lastReason, kind: "public_http", publicBase: base };
      }
      if (body !== token) {
        lastReason = "validation echo mismatch (ngrok interstitial, wrong URL, or route)";
        if (i < attempts - 1) {
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }
        return { ok: false, reason: lastReason, kind: "echo", publicBase: base };
      }
      return { ok: true };
    } catch (err) {
      clearTimeout(timer);
      lastReason = err?.name === "AbortError" ? `timed out after ${connectTimeoutMs}ms` : err?.message || String(err);
      if (!silent && i < attempts - 1) {
        console.warn(`⚠️ Webhook preflight ${i + 1}/${attempts}: ${lastReason} (retrying…)`);
      }
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, delayMs));
        continue;
      }
      return { ok: false, reason: lastReason, kind: "public_unreachable", publicBase: base };
    }
  }
  return { ok: false, reason: lastReason, kind: "exhausted", publicBase: base };
}

function printTeamsTunnelHelp(localOk, preflight) {
  const port = getServerPort();
  const pub = preflight.publicBase || String(process.env.NGROK_URL || "").replace(/\/$/, "");

  if (!localOk) {
    logPreflightBanner("TEAMS WEBHOOK — local check failed", [
      `This Node process could not GET the webhook on http://127.0.0.1:${port}/api/webhook/webhook`,
      `Detail: ${preflight.reason || "unknown"}`,
      "",
      "Fix: ensure server.listen() ran on PORT, nothing else bound that port, and /api/webhook is mounted.",
    ]);
    return;
  }

  logPreflightBanner("TEAMS WEBHOOK — public tunnel not reachable", [
    "Local webhook responded OK — Express is fine.",
    "",
    `Microsoft Graph must reach: ${getNotificationUrl()}`,
    `Last error: ${preflight.reason || "unknown"}`,
    "",
    "Do this on this machine:",
    `  1) Run a tunnel to this API, e.g.  ngrok http ${port}`,
    "  2) Put the https://… URL in .env as NGROK_URL= (no trailing slash)",
    "  3) Restart: node server.js",
    "",
    "Or turn off Teams push subscriptions:",
    "  TEAMS_SUBSCRIPTIONS_ENABLED=false",
    "",
    `Until then, Teams message webhooks stay disabled (tunnel was: ${pub || "unset"}).`,
  ]);
}

function hasSubscriptionConfig() {
  return Boolean(process.env.NGROK_URL && process.env.WEBHOOK_SECRET);
}

function getExpiryDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() + 55);
  return date.toISOString();
}

let renewalInterval = null;
let subscriptionRetryTimer = null;
let lastSubscriptionCount = 0;
let lastSubscriptionTime = null;

async function graphPost(endpoint, body) {
  const token = await getAccessToken();
  const timeoutMs = Math.max(15000, Number(process.env.GRAPH_REQUEST_TIMEOUT_MS || 90000));
  let clearTimer = () => {};
  let signal;
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    signal = AbortSignal.timeout(timeoutMs);
  } else {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    clearTimer = () => clearTimeout(t);
    signal = ac.signal;
  }

  let response;
  try {
    response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal,
    });
  } finally {
    clearTimer();
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(JSON.stringify(data));
  }
  return data;
}

async function deleteAllSubscriptions() {
  const token = await getAccessToken();
  const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  const subscriptions = data.value || [];

  if (subscriptions.length === 0) {
    console.log("No existing subscriptions to clean up");
    return true;
  }

  console.log(`Cleaning up ${subscriptions.length} existing subscriptions...`);
  for (const subscription of subscriptions) {
    await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscription.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  return true;
}

async function subscribeToAllChats() {
  let subscribed = 0;
  try {
    const token = await getAccessToken();
    const response = await fetch(
      "https://graph.microsoft.com/v1.0/chats?$filter=chatType eq 'group'",
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    const chats = data.value || [];
    console.log(`🔍 Found ${chats.length} group chats to subscribe to`);

    for (const chat of chats) {
      try {
        await graphPost("/subscriptions", {
          changeType: "created",
          notificationUrl: getNotificationUrl(),
          resource: `/chats/${chat.id}/messages`,
          expirationDateTime: getExpiryDateTime(),
          clientState: process.env.WEBHOOK_SECRET,
        });
        subscribed += 1;
        console.log(`✅ Subscribed to chat: ${chat.topic || chat.id}`);
      } catch (error) {
        if (error.message.includes("Subscription already exists")) {
          subscribed += 1;
          console.log(`ℹ️ Subscription already exists for chat: ${chat.topic || chat.id}`);
        } else {
          console.error(`❌ Failed to subscribe to chat ${chat.id}:`, error.message);
        }
      }
    }
  } catch (error) {
    console.error("❌ Chat subscription flow failed:", error.message);
  }

  // Fallback to broad subscription if individual failed
  if (subscribed === 0) {
    console.log("⚠️ No individual chat subscriptions succeeded, trying broad subscription...");
    try {
      await graphPost("/subscriptions", {
        changeType: "created",
        notificationUrl: getNotificationUrl(),
        resource: "/chats/getAllMessages",
        expirationDateTime: getExpiryDateTime(),
        clientState: process.env.WEBHOOK_SECRET,
      });
      console.log("✅ Subscribed to all group chats and DMs (broad)");
      return true;
    } catch (err) {
      const raw = err.message || String(err);
      let human = raw;
      try {
        const j = JSON.parse(raw);
        const m = j?.error?.message || "";
        if (String(m).toLowerCase().includes("validation") && String(m).toLowerCase().includes("timeout")) {
          human =
            "Microsoft could not reach your notification URL in time. " +
            "Fix NGROK_URL / run `ngrok http " +
            getServerPort() +
            "` — the same check must pass as \"Public webhook preflight\" in logs.";
        }
      } catch {
        /* use raw */
      }
      console.error("❌ Failed to subscribe to broad chats:", human);
    }
  }

  console.log(`🏁 Finished subscription flow. Total active subscriptions: ${subscribed}`);
  return subscribed > 0;
}

function scheduleSubscriptionRetry() {
  const autoRetry = String(process.env.GRAPH_SUBSCRIPTION_AUTO_RETRY || "").toLowerCase() === "true";
  if (!autoRetry) {
    return;
  }
  if (subscriptionRetryTimer) return;
  const intervalMs = Math.max(60000, Number(process.env.GRAPH_SUBSCRIPTION_RETRY_MS || 360000));
  const silentRetryLog = String(process.env.TEAMS_WEBHOOK_RETRY_QUIET || "true").toLowerCase() === "true";
  subscriptionRetryTimer = setInterval(async () => {
    try {
      const pre = await verifyPublicWebhookReachable({
        attempts: 1,
        timeoutMs: Math.max(15000, Number(process.env.GRAPH_WEBHOOK_PREFLIGHT_TIMEOUT_MS || 25000)),
        silent: true,
      });
      if (!pre.ok) {
        if (!silentRetryLog) {
          console.warn(
            `⏳ Teams: public tunnel still unreachable (${pre.reason}). ` +
              `Next check in ${Math.round(intervalMs / 60000)} min — fix NGROK_URL / run ngrok http ${getServerPort()}, or set TEAMS_SUBSCRIPTIONS_ENABLED=false`
          );
        }
        return;
      }
      console.log("🔁 Tunnel reachable — registering Microsoft Graph subscriptions…");
      await subscribeToAll();
    } catch (err) {
      console.warn("⚠️ Subscription retry failed:", err.message);
    }
  }, intervalMs);
}

async function subscribeToAllInner() {
  if (!subscriptionsEnabled()) {
    console.log("Teams subscriptions disabled by TEAMS_SUBSCRIPTIONS_ENABLED=false");
    return { enabled: false, subscribed: false };
  }

  if (!hasSubscriptionConfig()) {
    console.log("Teams subscriptions skipped because NGROK_URL or WEBHOOK_SECRET is missing");
    return { enabled: false, subscribed: false };
  }

  console.log("Setting up Graph subscriptions…");
  console.log("Notification URL (for Microsoft Graph):", getNotificationUrl());

  const preflight = await verifyPublicWebhookReachable();
  if (!preflight.ok) {
    printTeamsTunnelHelp(true, preflight);
    const autoRetry = String(process.env.GRAPH_SUBSCRIPTION_AUTO_RETRY || "").toLowerCase() === "true";
    if (!autoRetry) {
      console.log("ℹ️ Auto-retry is disabled (set GRAPH_SUBSCRIPTION_AUTO_RETRY=true to retry in background).");
    }
    scheduleSubscriptionRetry();
    return { enabled: true, subscribed: false };
  }
  console.log("✅ Public webhook preflight OK — Microsoft Graph validation should succeed");

  try {
    await deleteAllSubscriptions();
  } catch (error) {
    console.error("Error deleting subscriptions:", error.message);
  }

  const subscribed = await subscribeToAllChats();
  if (subscribed) {
    lastSubscriptionCount = typeof subscribed === 'number' ? subscribed : 1;
    lastSubscriptionTime = new Date();
    console.log("Graph subscriptions registered");
  } else {
    lastSubscriptionCount = 0;
    console.log("Graph subscriptions were not registered");
  }

  return { enabled: true, subscribed };
}

async function subscribeToAll() {
  const result = await subscribeToAllInner();
  if (result.subscribed && subscriptionRetryTimer) {
    clearInterval(subscriptionRetryTimer);
    subscriptionRetryTimer = null;
  }
  return result;
}

async function renewSubscriptions() {
  if (!subscriptionsEnabled() || !hasSubscriptionConfig()) {
    return;
  }

  try {
    const token = await getAccessToken();
    const response = await fetch("https://graph.microsoft.com/v1.0/subscriptions", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    const subscriptions = data.value || [];
    
    lastSubscriptionCount = subscriptions.length;
    lastSubscriptionTime = new Date();

    for (const subscription of subscriptions) {
      await fetch(`https://graph.microsoft.com/v1.0/subscriptions/${subscription.id}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ expirationDateTime: getExpiryDateTime() }),
      });
    }
  } catch (error) {
    const msg = error?.message || String(error);
    console.error(
      "❌ Teams subscription renewal failed (Graph token or network):",
      msg,
      "— check AZURE credentials, outbound HTTPS, and that subscriptions exist."
    );
  }
}

function startRenewalIntervalStatus() {
  renewalInterval = setInterval(() => {
    renewSubscriptions().catch((error) => {
      console.log("Subscription renewal failed:", error.message);
    });
  }, 50 * 60 * 1000);
}

function stopRenewalInterval() {
  if (renewalInterval) {
    console.log("🛑 Stopping Teams subscription renewal...");
    clearInterval(renewalInterval);
    renewalInterval = null;
  }
  if (subscriptionRetryTimer) {
    clearInterval(subscriptionRetryTimer);
    subscriptionRetryTimer = null;
  }
}

export function getTeamsStatus() {
  return {
    enabled: subscriptionsEnabled(),
    configured: hasSubscriptionConfig(),
    activeCount: lastSubscriptionCount,
    lastRenewal: lastSubscriptionTime,
    notificationUrl: getNotificationUrl()
  };
}

export { subscribeToAll, startRenewalIntervalStatus, stopRenewalInterval };
