import dotenv from "dotenv";
//teamsSubscription.js - manages Microsoft Graph API subscriptions for Teams message notifications, including setup, renewal, and cleanup logic
dotenv.config();

import { getAccessToken } from "./graphservice.js";

function subscriptionsEnabled() {
  return String(process.env.TEAMS_SUBSCRIPTIONS_ENABLED || "").toLowerCase() !== "false";
}

function getNotificationUrl() {
  return `${process.env.NGROK_URL || ""}/api/webhook/webhook`;
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
let lastSubscriptionCount = 0;
let lastSubscriptionTime = null;

async function graphPost(endpoint, body) {
  const token = await getAccessToken();
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

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
      console.error("❌ Failed to subscribe to broad chats:", err.message);
    }
  }

  console.log(`🏁 Finished subscription flow. Total active subscriptions: ${subscribed}`);
  return subscribed > 0;
}

async function subscribeToAll() {
  if (!subscriptionsEnabled()) {
    console.log("Teams subscriptions disabled by TEAMS_SUBSCRIPTIONS_ENABLED=false");
    return { enabled: false, subscribed: false };
  }

  if (!hasSubscriptionConfig()) {
    console.log("Teams subscriptions skipped because NGROK_URL or WEBHOOK_SECRET is missing");
    return { enabled: false, subscribed: false };
  }

  console.log("Setting up Graph subscriptions...");
  console.log("Notification URL:", getNotificationUrl());

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
    console.error("Error renewing subscriptions:", error.message);
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
