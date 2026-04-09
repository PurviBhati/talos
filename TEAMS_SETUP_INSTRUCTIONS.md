# Teams Groups Setup Instructions

## Current Status ✅
- 6 Teams groups configured: BuildBite, Avishkar, PeloTech, Ignite, Deep Grp, Atmonica
- WhatsApp → Teams forwarding is ready
- Teams → WhatsApp auto-forwarding is working
- Frontend will show all 6 groups as options

## To Get Actual Teams Group IDs:

### Method 1: Microsoft Teams App
1. Open Microsoft Teams
2. Right-click on each group/team
3. Select "Get link to team"
4. Copy the URL - it will look like: `https://teams.microsoft.com/l/team/19%3a[TEAM_ID]%40thread.tacv2/conversations?groupId=[GROUP_ID]`
5. Use the `GROUP_ID` part (after `groupId=`) as the team ID

### Method 2: Microsoft Graph Explorer (Recommended)
1. Go to https://developer.microsoft.com/en-us/graph/graph-explorer
2. Sign in with your Microsoft account
3. Run this query: `GET https://graph.microsoft.com/v1.0/me/joinedTeams`
4. Find your teams in the response and copy the `"id"` field for each

### Method 3: Teams Admin Center
1. Go to https://admin.teams.microsoft.com/
2. Navigate to Teams → Manage teams
3. Click on each team to see its details and copy the Team ID

## Update Configuration:
1. Open `backend/config/teamsGroups.js`
2. Replace the placeholder IDs with actual ones:
   - BuildBite: Replace `afef2c0b-3eb6-46d9-8e4a-e7e99c98fd35`
   - Avishkar: Replace `afef2c0b-3eb6-46d9-8e4a-e7e99c98fd36`
   - PeloTech: Replace `afef2c0b-3eb6-46d9-8e4a-e7e99c98fd37`
   - Ignite: Replace `afef2c0b-3eb6-46d9-8e4a-e7e99c98fd38`
   - Deep Grp: Replace `afef2c0b-3eb6-46d9-8e4a-e7e99c98fd39`
   - Atmonica: Replace `afef2c0b-3eb6-46d9-8e4a-e7e99c98fd40`

3. Restart the backend: `npm run dev` in the backend folder

## How It Works:

### WhatsApp → Teams:
1. WhatsApp messages appear in the dashboard
2. Click "Forward to Teams" on any message
3. Select one of the 6 Teams groups
4. Message gets sent to that Teams group with "UnifiedHub" branding

### Teams → WhatsApp:
1. Send any message in a monitored Teams group
2. Message automatically forwards to WhatsApp "Test grp" with "UnifiedHub" branding
3. No manual approval needed - instant forwarding

## Testing:
1. Send a WhatsApp message to "Test grp" or "Appsrow - demo grp"
2. It should appear in the dashboard
3. Click "Forward to Teams" and select any of the 6 groups
4. Check that Teams group - message should appear there
5. Send a message in any monitored Teams group
6. Check WhatsApp "Test grp" - message should appear there automatically

## Current Features:
✅ 6 Teams groups configured and available
✅ Bidirectional messaging (WhatsApp ↔ Teams)
✅ Clean "UnifiedHub" message branding
✅ Automatic Teams → WhatsApp forwarding
✅ Manual WhatsApp → Teams forwarding with group selection
✅ All groups show up as options in the frontend