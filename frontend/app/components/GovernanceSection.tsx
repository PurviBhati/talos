'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Draft {
  id: number;
  sender: string;
  source_type: 'teams' | 'slack' | 'whatsapp';
  chat_name: string;
  content: string;
  approved_draft?: string;
  approval_status?: string;
  created_at: string;
  original_body?: string;
  files?: unknown;
  priority?: string;
  ai_reasoning?: string;
}

interface WAGroup {
  id: string;
  name: string;
}

type GovernanceSectionProps = {
  C: Record<string, string>;
  ICONS: {
    slack: (size?: number, color?: string) => React.ReactNode;
    whatsapp: (size?: number, color?: string) => React.ReactNode;
    teams: (size?: number, color?: string) => React.ReactNode;
    sparkle: (size?: number, color?: string) => React.ReactNode;
  };
  API: string;
  SLACK_CHANNELS: { id: string; name: string }[];
  SectionHeader: React.ComponentType<{ title: string; sub: string; onRefresh: () => void; loading: boolean }>;
  EmptyState: React.ComponentType<{ message?: string; type?: 'info' | 'success' | 'error' }>;
  Dropdown: React.ComponentType<{
    label: string;
    icon: React.ReactNode;
    color: string;
    options: { id: string; name: string }[];
    onSelect: (id: string, name: string) => void;
    disabled?: boolean;
  }>;
  Avatar: React.ComponentType<{ name: string }>;
  FileAttachment: React.ComponentType<{ file: { name: string; url: string; publicUrl?: string; contentType?: string } }>;
  parseFiles: (v: unknown) => { name: string; url: string; publicUrl?: string }[];
  clean: (h: string) => string;
  formatDate: (iso: string) => string;
  authHeaders: () => HeadersInit;
  apiFetchJson: <T>(input: string, init?: RequestInit) => Promise<T>;
};

export function GovernanceSection(props: GovernanceSectionProps) {
  const { C, ICONS, API, SLACK_CHANNELS, SectionHeader, EmptyState, Dropdown, Avatar, FileAttachment, parseFiles, clean, formatDate, authHeaders, apiFetchJson } = props;

  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [localDrafts, setLocalDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [waGroups, setWaGroups] = useState<WAGroup[]>([]);
  const [sending, setSending] = useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = useState<'all' | 'slack' | 'whatsapp' | 'high'>('all');
  const approvingRef = useRef<Set<string>>(new Set());

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetchJson<Draft[]>(`${API}/api/messages/drafts`, { headers: authHeaders() });
      setDrafts(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load drafts';
      console.error('[Governance drafts]', err);
      setError(message);
      setDrafts([]);
    } finally {
      setLoading(false);
    }
  }, [API, apiFetchJson, authHeaders]);

  const fetchWAGroups = useCallback(async () => {
    try {
      const data = await apiFetchJson<WAGroup[]>(`${API}/api/messages/whatsapp-groups`, { headers: authHeaders() });
      setWaGroups(Array.isArray(data) ? data : []);
    } catch {}
  }, [API, apiFetchJson, authHeaders]);

  useEffect(() => {
    fetchDrafts();
    fetchWAGroups();
    const t = setInterval(fetchDrafts, 600000);
    return () => clearInterval(t);
  }, [fetchDrafts, fetchWAGroups]);

  async function handleApprove(draft: Draft, platform: 'slack' | 'whatsapp', target: string) {
    const lockKey = `${draft.id}-${platform}-${target}`;
    if (approvingRef.current.has(lockKey)) return;
    approvingRef.current.add(lockKey);

    const text = localDrafts[draft.id] ?? (draft.approved_draft || draft.content);
    setSending((p) => new Set([...p, draft.id]));
    try {
      await apiFetchJson(`${API}/api/messages/approve/${draft.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          platform,
          editedContent: text,
          source_type: draft.source_type,
          slackChannel: platform === 'slack' ? target : undefined,
          whatsappGroup: platform === 'whatsapp' ? target : undefined,
        }),
      });
      fetchDrafts();
    } catch (err) {
      console.error('[Approve]', err);
    } finally {
      setSending((p) => {
        const n = new Set(p);
        n.delete(draft.id);
        return n;
      });
      setTimeout(() => approvingRef.current.delete(lockKey), 3000);
    }
  }

  async function handleSaveDraft(id: number) {
    const content = localDrafts[id];
    if (!content) return;
    setSavingId(id);
    try {
      await fetch(`${API}/api/messages/drafts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ content }),
      });
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, approved_draft: content } : d)));
      setLocalDrafts((p) => {
        const n = { ...p };
        delete n[id];
        return n;
      });
    } catch (err) {
      console.error('[Save Draft]', err);
    } finally {
      setSavingId(null);
    }
  }

  async function handleIgnore(id: number) {
    await apiFetchJson(`${API}/api/messages/ignore/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() } });
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  const pendingRaw = drafts.filter((d) => !d.approval_status || d.approval_status === 'waiting');
  const approvedCount = drafts.filter((d) => d.approval_status === 'approved').length;

  const pending = pendingRaw.filter((d) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'slack') return d.source_type === 'slack';
    if (activeFilter === 'whatsapp') return d.source_type === 'whatsapp';
    if (activeFilter === 'high') return d.priority === 'high';
    return true;
  });

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <SectionHeader title="Talos" sub="Automated Intelligence Auditor" onRefresh={fetchDrafts} loading={loading} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, background: `${C.sidebar}44`, border: `1px solid ${C.border}66`, padding: '12px 18px', borderRadius: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, boxShadow: `0 0 10px ${C.accent}`, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Talos Live</span>
          </div>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {[{ icon: ICONS.slack(14, C.slack), label: 'Slack' }, { icon: ICONS.whatsapp(14, C.wa), label: 'WA' }, { icon: ICONS.teams(14, C.teams), label: 'Teams' }].map((p) => (
              <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }} title={`${p.label} Connected`}>
                {p.icon}
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderLeft: `1px solid ${C.border}66`, paddingLeft: 16, marginLeft: 'auto' }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{approvedCount}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase' }}>Approved Today</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.accent }}>{pendingRaw.length}</div>
            <div style={{ fontSize: 9, fontWeight: 700, color: C.dim, textTransform: 'uppercase' }}>Queue</div>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {(['all', 'slack', 'whatsapp', 'high'] as const).map((filter) => (
          <button key={filter} onClick={() => setActiveFilter(filter)} style={{ padding: '6px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', cursor: 'pointer', background: activeFilter === filter ? `${C.accent}33` : C.card, border: `1px solid ${activeFilter === filter ? C.accent : C.border}`, color: activeFilter === filter ? C.accent : C.muted }}>
            {filter === 'all' ? 'All' : filter}
          </button>
        ))}
      </div>
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : error ? (
        <EmptyState message={error} type="error" />
      ) : pending.length === 0 ? (
        <EmptyState message="No pending AI drafts" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {pending.map((draft) => {
            const isSending = sending.has(draft.id);
            const files = parseFiles(draft.files);
            return (
              <div key={draft.id} className="card-wrapper" style={{ background: C.card, border: `4px solid ${C.border}`, borderRadius: 14, padding: 20, position: 'relative', zIndex: 0 }}>
                <button onClick={() => handleIgnore(draft.id)} style={{ position: 'absolute', top: 14, right: 14, background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                <div className="gov-card-head" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, paddingRight: 36 }}>
                  <Avatar name={draft.sender} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{draft.sender}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                      {ICONS.teams(12, C.teams)} {draft.chat_name || 'Teams'} · <span style={{ textTransform: 'capitalize' }}>{draft.source_type}</span>
                    </div>
                  </div>
                  <div className="gov-card-meta" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 11, color: C.dim }}>{formatDate(draft.created_at)}</span>
                    {draft.priority && <span style={{ fontSize: 10, fontWeight: 700, background: draft.priority === 'high' ? '#ef444422' : `${C.accent}22`, color: draft.priority === 'high' ? '#ef4444' : C.accent, border: `1px solid ${draft.priority === 'high' ? '#ef444444' : `${C.accent}44`}`, padding: '1px 7px', borderRadius: 4, textTransform: 'uppercase' }}>{draft.priority}</span>}
                  </div>
                </div>
                {draft.original_body && draft.original_body !== draft.content && <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic', whiteSpace: 'pre-wrap', paddingRight: 6 }}>&quot;{clean(draft.original_body)}&quot;</div>}
                {files.map((f, i) => <FileAttachment key={i} file={f} />)}
                {draft.ai_reasoning && (
                  <div style={{ background: `${C.border}33`, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: C.dim, lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 10, whiteSpace: 'pre-wrap' }}>
                    <span style={{ marginTop: 2, flexShrink: 0 }}>{ICONS.sparkle(14, C.accent)}</span>
                    <span style={{ flex: 1 }}>{clean(draft.ai_reasoning)}</span>
                  </div>
                )}
                <textarea
                  value={localDrafts[draft.id] ?? (draft.approved_draft || clean(draft.content))}
                  onChange={(e) => setLocalDrafts((p) => ({ ...p, [draft.id]: e.target.value }))}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                  ref={(el) => {
                    if (el && !el.style.height) {
                      el.style.height = 'auto';
                      el.style.height = `${el.scrollHeight}px`;
                    }
                  }}
                  style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', color: C.text, fontSize: 13, resize: 'none', marginBottom: 16, minHeight: 44, maxHeight: 400, overflow: 'hidden', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }}
                />
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Dropdown label="Forward to Slack" icon={ICONS.slack(14, C.slack)} color={C.slack} options={SLACK_CHANNELS} onSelect={(id) => handleApprove(draft, 'slack', id)} disabled={isSending} />
                  <Dropdown label="Forward to WhatsApp" icon={ICONS.whatsapp(14, C.wa)} color={C.wa} options={waGroups.map((g) => ({ id: g.name, name: g.name }))} onSelect={(_, name) => handleApprove(draft, 'whatsapp', name)} disabled={isSending} />
                  {localDrafts[draft.id] !== undefined && localDrafts[draft.id] !== (draft.approved_draft || draft.content) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleSaveDraft(draft.id)} disabled={savingId === draft.id} style={{ background: `${C.accent}22`, color: C.accent, border: `1px solid ${C.accent}44`, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        {savingId === draft.id ? 'Saving...' : 'Save Draft'}
                      </button>
                      <button onClick={() => setLocalDrafts((p) => { const n = { ...p }; delete n[draft.id]; return n; })} style={{ background: 'transparent', color: C.dim, border: `1px solid ${C.border}`, padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        Discard
                      </button>
                    </div>
                  )}
                  {isSending && <span style={{ fontSize: 12, color: C.muted, marginLeft: 'auto' }}>Sending Message...</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
