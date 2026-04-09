const getAccessToken = async () => {
  const response = await fetch(
    `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data.access_token;
};

const graphRequest = async (endpoint) => {
  const token = await getAccessToken();
  const response = await fetch(`https://graph.microsoft.com/v1.0${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(JSON.stringify(data));
  return data;
};

const getAllTeams = async () => {
  const data = await graphRequest('/teams');
  return data.value;
};

const getChannels = async (teamId) => {
  const data = await graphRequest(`/teams/${teamId}/channels`);
  return data.value;
};

const getJoinedChats = async () => {
  const data = await graphRequest(`/chats?$filter=chatType eq 'group'`);
  return data.value;
};

const fetchTeamsMessages = async (teamId, channelId) => {
  const data = await graphRequest(`/teams/${teamId}/channels/${channelId}/messages`);
  return data.value;
};

export { getAccessToken, getAllTeams, getChannels, getJoinedChats, fetchTeamsMessages, graphRequest };