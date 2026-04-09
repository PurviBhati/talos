import express from 'express';
import { query } from "../db/index.js";

const router = express.Router();

// ─── DB Migration ─────────────────────────────────────────────────────────────
export async function initTasksTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      tenant_id TEXT NOT NULL DEFAULT 'tenant-default',
      source VARCHAR(20) NOT NULL,           -- 'slack' | 'whatsapp'
      source_message_id INTEGER,             -- FK to slack_messages or whatsapp_messages
      client_name VARCHAR(255),
      platform_label VARCHAR(100),           -- e.g. '#testdemo' or 'Test grp'
      body TEXT,                             -- original message
      links JSONB DEFAULT '[]',              -- extracted links
      images JSONB DEFAULT '[]',             -- extracted image URLs
      status VARCHAR(30) DEFAULT 'pending',  -- pending | in_progress | done | dismissed
      teams_task_id VARCHAR(255),            -- Teams Planner task ID if created
      teams_plan_id VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  console.log('✅ Tasks table ready');
}

// ─── Helper: extract links from text ─────────────────────────────────────────
function extractLinks(text) {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  return [...new Set(text.match(urlRegex) || [])];
}

// ─── Helper: detect if message should become a task ──────────────────────────
function shouldBeTask(body, images = []) {
  const links = extractLinks(body);
  const hasLink = links.length > 0;
  const hasImage = images && images.length > 0;
  return { isTask: hasLink || hasImage, links };
}

// ─── Exported helper for direct use in other routes ─────────────────────────
export async function detectAndCreateTask({ tenant_id = process.env.DEFAULT_TENANT_ID || "tenant-default", source, source_message_id, client_name, platform_label, body, images = [] }) {
  try {
    const links = extractLinks(body);
    const hasImage = images && images.length > 0;
    if (!links.length && !hasImage) return;

    // Avoid duplicates
    const existing = await query(
      `SELECT id FROM tasks WHERE tenant_id = $1 AND source = $2 AND source_message_id = $3`,
      [tenant_id, source, source_message_id]
    );
    if (existing.rows.length > 0) return;

    await query(
      `INSERT INTO tasks (tenant_id, source, source_message_id, client_name, platform_label, body, links, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [tenant_id, source, source_message_id, client_name, platform_label, body, JSON.stringify(links), JSON.stringify(images)]
    );
    console.log(`📋 Task created from ${source} - ${client_name}: "${body?.slice(0, 60)}"`);
  } catch (err) {
    console.error('Task detection error:', err.message);
  }
}

// ─── GET /api/tasks ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status } = req.query;
    let sql = `SELECT * FROM tasks WHERE tenant_id = $1`;
    const params = [tenantId];
    if (status) {
      sql += ` AND status = $2`;
      params.push(status);
    } else {
      sql += ` AND status != 'dismissed'`;
    }
    sql += ` ORDER BY created_at DESC LIMIT 100`;
    const result = await query(sql, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/tasks/detect ───────────────────────────────────────────────────
// Called when a new Slack/WhatsApp message arrives — auto-detect if it's a task
router.post('/detect', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { source, source_message_id, client_name, platform_label, body, images = [] } = req.body;

    const { isTask, links } = shouldBeTask(body, images);
    if (!isTask) return res.json({ created: false, reason: 'No links or images found' });

    // Check not already created
    const existing = await query(
      `SELECT id FROM tasks WHERE tenant_id = $1 AND source = $2 AND source_message_id = $3`,
      [tenantId, source, source_message_id]
    );
    if (existing.rows.length > 0) return res.json({ created: false, reason: 'Already exists' });

    const result = await query(
      `INSERT INTO tasks (tenant_id, source, source_message_id, client_name, platform_label, body, links, images)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [tenantId, source, source_message_id, client_name, platform_label, body, JSON.stringify(links), JSON.stringify(images)]
    );

    console.log(`📋 New task detected from ${source} - ${client_name}: "${body?.slice(0, 60)}"`);
    res.json({ created: true, task: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── PATCH /api/tasks/:id/status ─────────────────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const { status } = req.body;
    const valid = ['pending', 'in_progress', 'done', 'dismissed'];
    if (!valid.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const result = await query(
      `UPDATE tasks SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *`,
      [status, req.params.id, tenantId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/tasks/:id/create-planner ──────────────────────────────────────
// Create a task in Microsoft Teams Planner via Graph API
router.post('/:id/create-planner', async (req, res) => {
  try {
    const tenantId = req.tenantId;
    const taskRow = await query(`SELECT * FROM tasks WHERE id = $1 AND tenant_id = $2`, [req.params.id, tenantId]);
    if (!taskRow.rows.length) return res.status(404).json({ error: 'Task not found' });

    const task = taskRow.rows[0];
    const planId = process.env.TEAMS_PLANNER_PLAN_ID;
    const bucketId = process.env.TEAMS_PLANNER_BUCKET_ID;

    if (!planId || !bucketId) {
      return res.status(400).json({
        error: 'TEAMS_PLANNER_PLAN_ID and TEAMS_PLANNER_BUCKET_ID not set in .env'
      });
    }

    // Get Graph API token
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          scope: 'https://graph.microsoft.com/.default',
        }),
      }
    );
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) return res.status(500).json({ error: 'Failed to get Graph token', details: tokenData });

    // Build task title
    const title = `[${task.source.toUpperCase()}] ${task.client_name} — ${task.body?.slice(0, 80)}`;

    // Build notes with links
    const links = typeof task.links === 'string' ? JSON.parse(task.links) : (task.links || []);
    const notes = [
      `Source: ${task.source} / ${task.platform_label}`,
      `Client: ${task.client_name}`,
      `Message: ${task.body}`,
      links.length ? `\nLinks:\n${links.join('\n')}` : '',
    ].filter(Boolean).join('\n');

    // Create Planner task
    const plannerRes = await fetch('https://graph.microsoft.com/v1.0/planner/tasks', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        planId,
        bucketId,
        title,
        assignments: {},
      }),
    });

    const plannerTask = await plannerRes.json();
    if (!plannerRes.ok) return res.status(500).json({ error: 'Planner API failed', details: plannerTask });

    // Add notes via task details
    await fetch(`https://graph.microsoft.com/v1.0/planner/tasks/${plannerTask.id}/details`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'If-Match': plannerTask['@odata.etag'] || '*',
      },
      body: JSON.stringify({ description: notes }),
    });

    // Update our DB
    await query(
      `UPDATE tasks SET teams_task_id = $1, teams_plan_id = $2, status = 'in_progress', updated_at = NOW() WHERE id = $3`,
      [plannerTask.id, planId, task.id]
    );

    console.log(`✅ Teams Planner task created: ${plannerTask.id} for task ${task.id}`);
    res.json({ success: true, plannerTaskId: plannerTask.id, title });
  } catch (err) {
    console.error('Planner create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/tasks/m365-groups ───────────────────────────────────────────────
// Fetch Microsoft 365 Groups to find the right one for Planner
router.get('/m365-groups', async (req, res) => {
  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          scope: 'https://graph.microsoft.com/.default',
        }),
      }
    );
    const tokenData = await tokenRes.json();
    const token = tokenData.access_token;
    if (!token) return res.status(500).json({ error: 'Failed to get token', details: tokenData });

    const groupsRes = await fetch(
      'https://graph.microsoft.com/v1.0/groups?$select=id,displayName,groupTypes&$top=50',
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const groupsData = await groupsRes.json();
    
    // Filter to only M365 groups (ones that support Planner)
    const m365Groups = (groupsData.value || [])
      .filter(g => g.groupTypes?.includes('Unified'))
      .map(g => ({ id: g.id, name: g.displayName }));

    res.json({ groups: m365Groups, all: groupsData.value?.map(g => ({ id: g.id, name: g.displayName, types: g.groupTypes })) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/tasks/setup-planner ────────────────────────────────────────────
// Create a new Planner plan with buckets in a given M365 group
router.post('/setup-planner', async (req, res) => {
  try {
    const { groupId } = req.body;
    if (!groupId) return res.status(400).json({ error: 'groupId is required' });

    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          scope: 'https://graph.microsoft.com/.default',
        }),
      }
    );
    const { access_token: token } = await tokenRes.json();
    if (!token) return res.status(500).json({ error: 'Failed to get token' });

    // Create the plan
    const planRes = await fetch('https://graph.microsoft.com/v1.0/planner/plans', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner: groupId, title: 'OpenClaw Tasks' }),
    });
    const plan = await planRes.json();
    if (!planRes.ok) return res.status(500).json({ error: 'Failed to create plan', details: plan });

    // Create 3 buckets
    const buckets = ['Pending', 'In Progress', 'Done'];
    const bucketIds = {};
    for (const name of buckets) {
      const bRes = await fetch('https://graph.microsoft.com/v1.0/planner/buckets', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, planId: plan.id, orderHint: ' !' }),
      });
      const bucket = await bRes.json();
      bucketIds[name] = bucket.id;
    }

    console.log('✅ Planner setup complete. Plan ID:', plan.id);
    console.log('✅ Buckets:', bucketIds);

    res.json({
      success: true,
      planId: plan.id,
      buckets: bucketIds,
      message: `Add these to your .env:
TEAMS_PLANNER_PLAN_ID=${plan.id}
TEAMS_PLANNER_BUCKET_ID=${bucketIds['Pending']}`
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
