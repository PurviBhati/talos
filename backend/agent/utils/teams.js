import { getAccessToken } from "../../services/graphservice.js";

export const sendTeamsMessage = async (teamId, channelId, text) => {
  const token = await getAccessToken();
  const res = await fetch(
    `https://graph.microsoft.com/v1.0/teams/${teamId}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: { contentType: "text", content: text },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Failed to send Teams message");
  console.log(`✅ Sent to Teams channel ${channelId}`);
  return data;
};