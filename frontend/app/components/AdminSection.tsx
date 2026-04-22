'use client';
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useState } from 'react';

type AdminSectionProps = {
  C: Record<string, string>;
  ICONS: {
    sparkle: (size?: number, color?: string) => React.ReactNode;
    teams: (size?: number, color?: string) => React.ReactNode;
    whatsapp: (size?: number, color?: string) => React.ReactNode;
  };
  API: string;
  authHeaders: () => HeadersInit;
  apiFetchJson: <T>(input: string, init?: RequestInit) => Promise<T>;
};

export function AdminSection(props: AdminSectionProps) {
  const { C, ICONS, API, authHeaders, apiFetchJson } = props;
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [aiConfig, setAiConfig] = useState<any>(null);
  const [aiApiKeyInput, setAiApiKeyInput] = useState('');
  const [aiModelInput, setAiModelInput] = useState('gpt-4o');
  const [aiSaving, setAiSaving] = useState(false);
  const [aiMsg, setAiMsg] = useState('');
  const [supabaseConfig, setSupabaseConfig] = useState<any>(null);
  const [supabaseUrlInput, setSupabaseUrlInput] = useState('');
  const [supabaseServiceKeyInput, setSupabaseServiceKeyInput] = useState('');
  const [supabaseBucketInput, setSupabaseBucketInput] = useState('');
  const [supabaseDbUrlInput, setSupabaseDbUrlInput] = useState('');
  const [supabaseSaving, setSupabaseSaving] = useState(false);
  const [supabaseMsg, setSupabaseMsg] = useState('');
  const [supabaseVerifying, setSupabaseVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');
  const [schemaText, setSchemaText] = useState('');
  const [supabaseVerified, setSupabaseVerified] = useState(false);

  const fetchHealth = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetchJson<any>(`${API}/api/messages/health`, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        }
      });
      setHealth(data);
    } catch (err) {
      console.error('Health check fetch error:', err);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  }, [API, apiFetchJson, authHeaders]);

  const fetchAiConfig = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/settings/ai`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const cfg = data?.config || null;
      setAiConfig(cfg);
      setAiModelInput(cfg?.model || 'gpt-4o');
      setAiApiKeyInput('');
    } catch (err: any) {
      setAiMsg(`Failed to load AI config: ${err?.message || 'unknown error'}`);
    }
  }, [API, authHeaders]);

  const saveAiConfig = async () => {
    setAiSaving(true);
    setAiMsg('');
    try {
      const payload: Record<string, any> = {};
      if (aiApiKeyInput.trim()) payload.apiKey = aiApiKeyInput.trim();
      if (aiModelInput.trim()) payload.model = aiModelInput.trim();
      if (Object.keys(payload).length === 0) {
        setAiMsg('Enter API key or model first.');
        setAiSaving(false);
        return;
      }
      const r = await fetch(`${API}/api/settings/ai`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.success === false) throw new Error(data?.error || `HTTP ${r.status}`);
      setAiMsg('AI config updated.');
      await fetchAiConfig();
    } catch (err: any) {
      setAiMsg(`Save failed: ${err?.message || 'unknown error'}`);
    } finally {
      setAiSaving(false);
    }
  };

  const resetAiConfig = async () => {
    setAiSaving(true);
    setAiMsg('');
    try {
      const r = await fetch(`${API}/api/settings/ai`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ reset: true }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.success === false) throw new Error(data?.error || `HTTP ${r.status}`);
      setAiMsg('AI config reset to .env defaults.');
      await fetchAiConfig();
    } catch (err: any) {
      setAiMsg(`Reset failed: ${err?.message || 'unknown error'}`);
    } finally {
      setAiSaving(false);
    }
  };

  const fetchSupabaseConfig = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/settings/supabase`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const cfg = data?.config || null;
      setSupabaseConfig(cfg);
      setSupabaseUrlInput(cfg?.url || '');
      setSupabaseBucketInput(cfg?.bucket || '');
      setSupabaseServiceKeyInput('');
      setSupabaseDbUrlInput('');
      setSupabaseVerified(false);
    } catch (err: any) {
      setSupabaseMsg(`Failed to load Supabase config: ${err?.message || 'unknown error'}`);
    }
  }, [API, authHeaders]);

  const saveSupabaseConfig = async () => {
    setSupabaseSaving(true);
    setSupabaseMsg('');
    try {
      if (!supabaseUrlInput.trim() || !supabaseServiceKeyInput.trim() || !supabaseDbUrlInput.trim()) {
        setSupabaseMsg('Fill URL, Service Key and DB URL (bucket can fallback to .env).');
        setSupabaseSaving(false);
        return;
      }
      const r = await fetch(`${API}/api/settings/supabase`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          url: supabaseUrlInput.trim(),
          serviceKey: supabaseServiceKeyInput.trim(),
          bucket: supabaseBucketInput.trim() || undefined,
          dbUrl: supabaseDbUrlInput.trim(),
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.success === false) throw new Error(data?.error || `HTTP ${r.status}`);
      setSupabaseMsg(data?.message || 'Supabase config saved.');
      setSupabaseVerified(false);
      await fetchSupabaseConfig();
    } catch (err: any) {
      setSupabaseMsg(`Save failed: ${err?.message || 'unknown error'}`);
    } finally {
      setSupabaseSaving(false);
    }
  };

  const resetSupabaseConfig = async () => {
    setSupabaseSaving(true);
    setSupabaseMsg('');
    try {
      const r = await fetch(`${API}/api/settings/supabase`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ reset: true }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.success === false) throw new Error(data?.error || `HTTP ${r.status}`);
      setSupabaseMsg(data?.message || 'Supabase config reset.');
      setSupabaseVerified(false);
      await fetchSupabaseConfig();
    } catch (err: any) {
      setSupabaseMsg(`Reset failed: ${err?.message || 'unknown error'}`);
    } finally {
      setSupabaseSaving(false);
    }
  };

  const verifySupabaseConfig = async () => {
    setSupabaseVerifying(true);
    setVerifyMsg('');
    try {
      const r = await fetch(`${API}/api/settings/supabase/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ dbUrl: supabaseDbUrlInput.trim() || undefined }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok || data?.success === false) throw new Error(data?.error || `HTTP ${r.status}`);
      setVerifyMsg(`Verified: ${data?.dbHost || 'connection ok'}`);
      setSupabaseVerified(true);
      setSupabaseConfig((prev: any) => ({
        ...(prev || {}),
        lastVerifiedAt: data?.lastVerifiedAt || new Date().toISOString(),
        lastVerifiedDbHost: data?.dbHost || prev?.lastVerifiedDbHost || '',
      }));
    } catch (err: any) {
      setVerifyMsg(`Verify failed: ${err?.message || 'unknown error'}`);
      setSupabaseVerified(false);
    } finally {
      setSupabaseVerifying(false);
    }
  };

  const fetchSchemaText = async () => {
    if (schemaText) return schemaText;
    const r = await fetch(`${API}/api/settings/schema`, { headers: authHeaders() });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data?.success === false) throw new Error(data?.error || `HTTP ${r.status}`);
    const schema = String(data?.schema || '');
    setSchemaText(schema);
    return schema;
  };

  const copySchema = async () => {
    try {
      const schema = await fetchSchemaText();
      await navigator.clipboard.writeText(schema);
      setVerifyMsg('Schema copied to clipboard.');
    } catch (err: any) {
      setVerifyMsg(`Copy failed: ${err?.message || 'unknown error'}`);
    }
  };

  const downloadSchema = async () => {
    try {
      const r = await fetch(`${API}/api/settings/schema/download`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const blob = await r.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'schema.sql';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setVerifyMsg('Schema downloaded.');
    } catch (err: any) {
      setVerifyMsg(`Download failed: ${err?.message || 'unknown error'}`);
    }
  };

  const copySchemaImportCommand = async () => {
    const cmd = `psql "$SUPABASE_DB_URL" -v ON_ERROR_STOP=1 -f database/schema.sql`;
    try {
      await navigator.clipboard.writeText(cmd);
      setVerifyMsg('Import command copied.');
    } catch (err: any) {
      setVerifyMsg(`Copy command failed: ${err?.message || 'unknown error'}`);
    }
  };

  useEffect(() => {
    fetchHealth();
    fetchAiConfig();
    fetchSupabaseConfig();
    const t = setInterval(fetchHealth, 30000);
    return () => clearInterval(t);
  }, [fetchHealth, fetchAiConfig, fetchSupabaseConfig]);

  if (loading && !health) return <div style={{ padding: 80, textAlign: 'center', color: C.muted, background: C.bg }}>Loading system status...</div>;

  if (!health && !loading) return (
    <div style={{ padding: 80, textAlign: 'center', color: C.muted, background: C.bg }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
      <p style={{ color: C.textSoft, fontWeight: 600 }}>Unable to retrieve system health data.</p>
      <button onClick={fetchHealth} style={{ marginTop: 20, padding: '8px 16px', background: C.accent, color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Retry Connection</button>
    </div>
  );

  const teamsOk = !!health?.teams?.enabled;
  const waOk = !!health?.whatsapp?.isReady;
  const dbOk = health?.db === 'ok';

  return (
    <div style={{ padding: 'clamp(12px, 3vw, 32px)', maxWidth: 1220, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 className="admin-heading" style={{ fontSize: 28, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>System Admin</h1>
          <p style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Operations console for runtime configuration and infrastructure health.</p>
        </div>
        <button onClick={fetchHealth} style={{ padding: '10px 14px', background: `${C.accent}15`, border: `1px solid ${C.accent}33`, borderRadius: 10, color: C.accent, fontWeight: 700, cursor: 'pointer', fontSize: 13, outline: 'none' }}>
          Refresh Status
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {[
          { label: 'Database', value: dbOk ? 'Connected' : 'Error', color: dbOk ? '#10b981' : '#ef4444' },
          { label: 'Teams', value: teamsOk ? 'Active' : 'Disabled', color: teamsOk ? '#10b981' : '#ef4444' },
          { label: 'WhatsApp', value: waOk ? 'Online' : 'Offline', color: waOk ? '#10b981' : '#f59e0b' },
          { label: 'Monitored Chats', value: String(health?.config?.monitoredChats || 0), color: C.accent },
        ].map((item) => (
          <div key={item.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '12px 14px' }}>
            <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: item.color, marginTop: 4 }}>{item.value}</div>
          </div>
        ))}
      </div>

      <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div className="admin-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 'clamp(14px, 2.4vw, 24px)', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {ICONS.sparkle(20, C.accent)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>AI Configuration</h3>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>
                Active model: <span style={{ color: C.text, fontWeight: 700 }}>{aiConfig?.model || aiModelInput || 'gpt-4o'}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="password" value={aiApiKeyInput} onChange={(e) => setAiApiKeyInput(e.target.value)} placeholder="OpenAI API key (optional override)" style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }} />
            <input type="text" value={aiModelInput} onChange={(e) => setAiModelInput(e.target.value)} placeholder="Model (default gpt-4o)" style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={saveAiConfig} disabled={aiSaving} style={{ background: `${C.accent}22`, border: `1px solid ${C.accent}44`, color: C.accent, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: aiSaving ? 'not-allowed' : 'pointer' }}>{aiSaving ? 'Saving...' : 'Save AI Config'}</button>
              <button onClick={resetAiConfig} disabled={aiSaving} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: aiSaving ? 'not-allowed' : 'pointer' }}>Reset</button>
            </div>
            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>Key source: <b style={{ color: C.text }}>{aiConfig?.keySource || 'env'}</b>{aiConfig?.maskedKey ? ` (${aiConfig.maskedKey})` : ''}</div>
            {aiMsg && <div style={{ fontSize: 11, color: aiMsg.toLowerCase().includes('failed') ? '#ef4444' : C.accent }}>{aiMsg}</div>}
          </div>
        </div>

        <div className="admin-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 'clamp(14px, 2.4vw, 24px)', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.teams}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 18 }}>🗄️</span></div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Supabase Configuration</h3>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>Source: <span style={{ color: C.text, fontWeight: 700 }}>{supabaseConfig?.source || 'env'}</span>{supabaseConfig?.dbHost ? ` | ${supabaseConfig.dbHost}` : ''}</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input type="text" value={supabaseUrlInput} onChange={(e) => { setSupabaseUrlInput(e.target.value); setSupabaseVerified(false); }} placeholder="SUPABASE_URL" style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }} />
            <input type="password" value={supabaseServiceKeyInput} onChange={(e) => { setSupabaseServiceKeyInput(e.target.value); setSupabaseVerified(false); }} placeholder="SUPABASE_SERVICE_KEY" style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }} />
            <input type="text" value={supabaseBucketInput} onChange={(e) => { setSupabaseBucketInput(e.target.value); setSupabaseVerified(false); }} placeholder="SUPABASE_BUCKET (optional override)" style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }} />
            <div style={{ fontSize: 11, color: C.dim, marginTop: -4 }}>Leave bucket empty to use default from <b style={{ color: C.text }}>.env</b>.</div>
            <input type="password" value={supabaseDbUrlInput} onChange={(e) => { setSupabaseDbUrlInput(e.target.value); setSupabaseVerified(false); }} placeholder="SUPABASE_DB_URL (pooler URI)" style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }} />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={verifySupabaseConfig} disabled={supabaseVerifying} style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}44`, color: C.accent, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseVerifying ? 'not-allowed' : 'pointer' }}>{supabaseVerifying ? 'Verifying...' : 'Verify Connection'}</button>
              <button onClick={saveSupabaseConfig} disabled={supabaseSaving} style={{ background: `${C.teams}22`, border: `1px solid ${C.teams}55`, color: C.teams, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseSaving ? 'not-allowed' : 'pointer' }}>{supabaseSaving ? 'Saving...' : 'Save Supabase'}</button>
              <button onClick={resetSupabaseConfig} disabled={supabaseSaving} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseSaving ? 'not-allowed' : 'pointer' }}>Reset</button>
              <button onClick={copySchema} disabled={!supabaseVerified} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: supabaseVerified ? C.text : C.dim, opacity: supabaseVerified ? 1 : 0.6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseVerified ? 'pointer' : 'not-allowed' }}>Copy Schema</button>
              <button onClick={downloadSchema} disabled={!supabaseVerified} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: supabaseVerified ? C.text : C.dim, opacity: supabaseVerified ? 1 : 0.6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseVerified ? 'pointer' : 'not-allowed' }}>Download Schema</button>
              <button onClick={copySchemaImportCommand} disabled={!supabaseVerified} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: supabaseVerified ? C.text : C.dim, opacity: supabaseVerified ? 1 : 0.6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseVerified ? 'pointer' : 'not-allowed' }}>Copy Import Command</button>
            </div>
            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              Service key: <b style={{ color: C.text }}>{supabaseConfig?.serviceKeyMasked || 'not set'}</b><br />
              DB URL: <b style={{ color: C.text }}>{supabaseConfig?.dbUrlMasked || 'not set'}</b><br />
              Last verified: <b style={{ color: C.text }}>{supabaseConfig?.lastVerifiedAt ? `${new Date(supabaseConfig.lastVerifiedAt).toLocaleString()}${supabaseConfig?.lastVerifiedDbHost ? ` (${supabaseConfig.lastVerifiedDbHost})` : ''}` : 'never'}</b><br />
              Restart backend after save, then run schema import on the target DB.
            </div>
            {supabaseMsg && <div style={{ fontSize: 11, color: supabaseMsg.toLowerCase().includes('failed') ? '#ef4444' : C.accent }}>{supabaseMsg}</div>}
            {verifyMsg && <div style={{ fontSize: 11, color: verifyMsg.toLowerCase().includes('failed') ? '#ef4444' : C.accent }}>{verifyMsg}</div>}
            {!supabaseVerified && <div style={{ fontSize: 11, color: C.dim }}>Verify connection first to enable schema actions.</div>}
          </div>
        </div>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 'clamp(14px, 2.4vw, 24px)' }}>
        <div style={{ fontSize: 12, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>Service Status</div>
        <div className="admin-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          <div className="admin-card" style={{ background: `${C.bg}80`, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#4B53BC15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ICONS.teams(20, '#4B53BC')}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Microsoft Teams</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: health?.teams?.enabled ? '#10b981' : '#ef4444' }}></div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: health?.teams?.enabled ? '#10b981' : '#ef4444' }}>{health?.teams?.enabled ? 'Active' : 'Disabled'}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-kv" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: C.muted }}>Active Subscriptions</span>
                <span className="admin-kv-value" style={{ color: C.text, fontWeight: 600, wordBreak: 'break-word' }}>{health?.teams?.activeCount || 0}</span>
              </div>
              <div className="admin-kv" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: C.muted }}>Last Renewal</span>
                <span className="admin-kv-value" style={{ color: C.text, fontWeight: 600, wordBreak: 'break-word' }}>{health?.teams?.lastRenewal ? new Date(health.teams.lastRenewal).toLocaleTimeString() : 'Never'}</span>
              </div>
              <div style={{ fontSize: 11, color: C.dim, background: `${C.bg}80`, padding: '8px 12px', borderRadius: 8, wordBreak: 'break-word', overflowWrap: 'anywhere', marginTop: 8 }}>Webhook: {health?.teams?.notificationUrl}</div>
            </div>
          </div>

          <div className="admin-card" style={{ background: `${C.bg}80`, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: '#25D36615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{ICONS.whatsapp(20, '#25D366')}</div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>WhatsApp Bot</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: health?.whatsapp?.isReady ? '#10b981' : '#f59e0b' }}></div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: health?.whatsapp?.isReady ? '#10b981' : '#f59e0b' }}>{health?.whatsapp?.status || 'Offline'}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-kv" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: C.muted }}>Monitored Groups</span>
                <span className="admin-kv-value" style={{ color: C.text, fontWeight: 600, wordBreak: 'break-word' }}>{health?.whatsapp?.groups || 0}</span>
              </div>
              <div className="admin-kv" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: C.muted }}>Last Health Check</span>
                <span className="admin-kv-value" style={{ color: C.text, fontWeight: 600, wordBreak: 'break-word' }}>{health?.whatsapp?.lastHealthCheck ? new Date(health.whatsapp.lastHealthCheck).toLocaleTimeString() : 'Never'}</span>
              </div>
            </div>
          </div>

          <div className="admin-card" style={{ background: `${C.bg}80`, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><span style={{ fontSize: 20 }}>⚙️</span></div>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Infrastructure</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: health?.db === 'ok' ? '#10b981' : '#ef4444' }}></div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: health?.db === 'ok' ? '#10b981' : '#ef4444' }}>Database {health?.db === 'ok' ? 'Connected' : 'Error'}</span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="admin-kv" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: C.muted }}>Server Port</span>
                <span className="admin-kv-value" style={{ color: C.text, fontWeight: 600, wordBreak: 'break-word' }}>{health?.config?.port}</span>
              </div>
              <div className="admin-kv" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 8, flexWrap: 'wrap' }}>
                <span style={{ color: C.muted }}>Monitored Teams Chats</span>
                <span className="admin-kv-value" style={{ color: C.text, fontWeight: 600, wordBreak: 'break-word' }}>{health?.config?.monitoredChats}</span>
              </div>
              <div style={{ fontSize: 11, color: C.dim, background: `${C.bg}80`, padding: '8px 12px', borderRadius: 8, wordBreak: 'break-word', overflowWrap: 'anywhere', marginTop: 8 }}>NGROK: {health?.config?.ngrok}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
