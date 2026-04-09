import express from 'express';
import { query } from '../db/index.js';

const router = express.Router();

// ─── GET /api/settings/mappings ───────────────────────────────────────────────

router.get('/settings/mappings', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, tenant_id, teams_chat_id, teams_chat_name, slack_channel_id, slack_channel_name,
              project_name, whatsapp_number, whatsapp_numbers, whatsapp_group_name, active, created_at
       FROM channel_mappings
       ORDER BY created_at DESC`
    );

    const mappings = result.rows.map(r => ({
      ...r,
      teams_thread_id:  r.teams_chat_id,
      slack_channels:   r.slack_channel_id ? [r.slack_channel_id] : [],
      whatsapp_numbers: Array.isArray(r.whatsapp_numbers) && r.whatsapp_numbers.length > 0
                          ? r.whatsapp_numbers
                          : r.whatsapp_number ? [r.whatsapp_number] : [],
    }));

    res.json({ success: true, mappings });
  } catch (err) {
    console.error('[Settings] GET mappings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/settings/mappings ─────────────────────────────────────────────

router.post('/settings/mappings', async (req, res) => {
  const {
    teams_thread_id, teams_chat_name = '', slack_channel_id = '',
    slack_channel_name = '', project_name = '',
    whatsapp_numbers, whatsapp_number = '', whatsapp_group_name = '',
    tenant_id, active = true,
  } = req.body;

  if (!teams_thread_id?.trim()) {
    return res.status(400).json({ success: false, error: 'teams_chat_id is required' });
  }

  const waNumbers = normalizeArray(whatsapp_numbers);
  const tid = (tenant_id || process.env.DEFAULT_TENANT_ID || 'tenant-default').trim();

  try {
    const result = await query(
      `INSERT INTO channel_mappings
         (tenant_id, teams_chat_id, teams_chat_name, slack_channel_id, slack_channel_name,
          project_name, whatsapp_number, whatsapp_numbers, whatsapp_group_name, active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW()) RETURNING *`,
      [
        tid,
        teams_thread_id.trim(),
        teams_chat_name.trim()    || teams_thread_id.trim(),
        slack_channel_id.trim(),
        slack_channel_name.trim() || slack_channel_id.trim(),
        project_name.trim()       || 'OpenClaw',
        whatsapp_number.trim()    || (waNumbers[0] || ''),
        waNumbers,
        whatsapp_group_name.trim() || null,
        active,
      ]
    );
    const r = result.rows[0];
    res.json({ success: true, mapping: normalize(r) });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ success: false, error: 'This Teams chat ID already exists' });
    console.error('[Settings] POST mappings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/settings/mappings/:id ──────────────────────────────────────────

router.put('/settings/mappings/:id', async (req, res) => {
  const { id } = req.params;
  const {
    teams_thread_id, teams_chat_name, slack_channel_id, slack_channel_name,
    project_name, whatsapp_numbers, whatsapp_number, whatsapp_group_name, tenant_id, active,
  } = req.body;

  const waNumbers = normalizeArray(whatsapp_numbers);

  try {
    const result = await query(
      `UPDATE channel_mappings SET
         tenant_id            = COALESCE($1, tenant_id),
         teams_chat_id      = COALESCE($2, teams_chat_id),
         teams_chat_name    = COALESCE($3, teams_chat_name),
         slack_channel_id   = COALESCE($4, slack_channel_id),
         slack_channel_name = COALESCE($5, slack_channel_name),
         project_name       = COALESCE($6, project_name),
         whatsapp_number    = COALESCE($7, whatsapp_number),
         whatsapp_numbers   = $8,
         whatsapp_group_name = COALESCE($9, whatsapp_group_name),
         active             = COALESCE($10, active)
       WHERE id = $11 RETURNING *`,
      [
        tenant_id?.trim() || null,
        teams_thread_id?.trim()    || null,
        teams_chat_name?.trim()    || null,
        slack_channel_id?.trim()   || null,
        slack_channel_name?.trim() || null,
        project_name?.trim()       || null,
        whatsapp_number?.trim()    || (waNumbers[0] || null),
        waNumbers,
        whatsapp_group_name !== undefined ? (whatsapp_group_name?.trim() || null) : null,
        active ?? null,
        id,
      ]
    );
    if (!result.rows[0]) return res.status(404).json({ success: false, error: 'Mapping not found' });
    res.json({ success: true, mapping: normalize(result.rows[0]) });
  } catch (err) {
    console.error('[Settings] PUT mappings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/settings/mappings/:id ───────────────────────────────────────

router.delete('/settings/mappings/:id', async (req, res) => {
  try {
    await query(`DELETE FROM channel_mappings WHERE id = $1`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('[Settings] DELETE mappings:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PATCH /api/settings/mappings/:id/toggle ─────────────────────────────────

router.patch('/settings/mappings/:id/toggle', async (req, res) => {
  try {
    const result = await query(
      `UPDATE channel_mappings SET active = NOT active WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    res.json({ success: true, mapping: normalize(result.rows[0]) });
  } catch (err) {
    console.error('[Settings] PATCH toggle:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(r) {
  return {
    ...r,
    teams_thread_id:  r.teams_chat_id,
    slack_channels:   r.slack_channel_id ? [r.slack_channel_id] : [],
    whatsapp_numbers: Array.isArray(r.whatsapp_numbers) && r.whatsapp_numbers.length > 0
                        ? r.whatsapp_numbers
                        : r.whatsapp_number ? [r.whatsapp_number] : [],
  };
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(v => String(v).trim()).filter(Boolean);
  if (typeof value === 'string') return value.split(',').map(v => v.trim()).filter(Boolean);
  return [];
}

export default router;