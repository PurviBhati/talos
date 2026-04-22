'use client';
/* eslint-disable @next/next/no-img-element, react/no-unescaped-entities */

import { useCallback, useEffect, useState } from 'react';

interface ForwardLog {
  id: number;
  source: string;
  destination: string;
  source_channel: string;
  dest_channel: string;
  message_preview: string;
  status: string;
  error_reason: string | null;
  task_id: number | null;
  forwarded_at: string;
  ai_category?: string;
  ai_reason?: string;
  is_batched?: boolean;
  media_urls?: string | string[];
}

type ForwardLogSectionProps = {
  C: Record<string, string>;
  ICONS: {
    check: (size?: number, color?: string) => React.ReactNode;
    error: (size?: number, color?: string) => React.ReactNode;
    link: (size?: number, color?: string) => React.ReactNode;
    slack: (size?: number, color?: string) => React.ReactNode;
    whatsapp: (size?: number, color?: string) => React.ReactNode;
    teams: (size?: number, color?: string) => React.ReactNode;
    arrowRight: (size?: number, color?: string) => React.ReactNode;
  };
  API: string;
  EmptyState: React.ComponentType<{ message?: string; type?: 'info' | 'success' | 'error' }>;
  resolveSlack: (id: string, fallback: string) => string;
  parseLinks: (v: unknown) => string[];
  proxyUrl: (url: string) => string;
  clean: (h: string) => string;
  authHeaders: () => HeadersInit;
  apiFetchJson: <T>(input: string, init?: RequestInit) => Promise<T>;
};

export function ForwardLogSection(props: ForwardLogSectionProps) {
  const { C, ICONS, API, EmptyState, resolveSlack, parseLinks, proxyUrl, clean, authHeaders, apiFetchJson } = props;
  const [logs, setLogs] = useState<ForwardLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'delivered' | 'failed' | 'skipped'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'whatsapp' | 'slack' | 'teams'>('all');
  const [error, setError] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter !== 'all') params.append('status', filter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      let data: ForwardLog[];
      try {
        data = await apiFetchJson<ForwardLog[]>(`${API}/api/forward-logs?${params}`, { headers: authHeaders() });
      } catch {
        if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
          data = await apiFetchJson<ForwardLog[]>(`http://${window.location.hostname}:5000/api/forward-logs?${params}`, { headers: authHeaders() });
        } else {
          throw new Error('API base URL is unreachable. Set NEXT_PUBLIC_API_URL.');
        }
      }
      setLogs(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load forward logs';
      console.error('[ForwardLog]', err);
      setError(message);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [API, apiFetchJson, authHeaders, filter, sourceFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => {
    const t = setInterval(fetchLogs, 30000);
    return () => clearInterval(t);
  }, [fetchLogs]);

  const delivered = logs.filter((l) => l.status === 'delivered').length;
  const failed = logs.filter((l) => l.status === 'failed').length;
  const skipped = logs.filter((l) => l.status === 'skipped' || l.status === 'no_mapping').length;

  const statusColor = (s: string) => (s === 'delivered' ? '#22c55e' : s === 'failed' ? '#ef4444' : C.dim);
  const getDateLabel = (iso: string) => {
    if (!iso) return 'Unknown';
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const groupedLogs: { dateLabel: string; logs: ForwardLog[] }[] = [];
  let currentLabel = '';
  logs.forEach((log) => {
    const label = getDateLabel(log.forwarded_at);
    if (label !== currentLabel) {
      groupedLogs.push({ dateLabel: label, logs: [] });
      currentLabel = label;
    }
    groupedLogs[groupedLogs.length - 1].logs.push(log);
  });

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Forward Log</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>Real-time trail of every message OpenClaw processed</div>
        </div>
        <button onClick={fetchLogs} disabled={loading} style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}33`, color: loading ? C.muted : C.accent, padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading ? '...' : <>Refresh</>}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[{ label: 'Total', val: logs.length, color: C.text }, { label: 'Delivered', val: delivered, color: '#22c55e' }, { label: 'Failed', val: failed, color: '#ef4444' }, { label: 'Skipped', val: skipped, color: C.dim }].map((stat) => (
          <div key={stat.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.val}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'delivered', 'failed', 'skipped'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', background: filter === s ? `${C.accent}33` : C.card, border: `1px solid ${filter === s ? C.accent : C.border}`, color: filter === s ? C.accent : C.muted }}>{s}</button>
        ))}
        <div style={{ width: 1, background: C.border, margin: '0 4px' }} />
        {(['all', 'whatsapp', 'slack', 'teams'] as const).map((s) => (
          <button key={s} onClick={() => setSourceFilter(s)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', background: sourceFilter === s ? `${C.wa}22` : C.card, border: `1px solid ${sourceFilter === s ? C.wa : C.border}`, color: sourceFilter === s ? C.wa : C.muted }}>{s}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading logs...</div>
      ) : error ? (
        <EmptyState message={error} type="error" />
      ) : logs.length === 0 ? (
        <EmptyState message="No flow logs recorded matching current filters." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {groupedLogs.map((group, gi) => (
            <div key={gi}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <div style={{ fontSize: 11, color: C.dim, fontWeight: 800, padding: '4px 14px', background: C.sidebar, borderRadius: 20, border: `1px solid ${C.border}`, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{group.dateLabel}</div>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.logs.map((log) => {
                  const sc = statusColor(log.status);
                  const isS = log.source === 'slack';
                  const isD = log.destination === 'slack';
                  return (
                    <div key={log.id} style={{ background: C.card, border: `1px solid ${log.status === 'failed' ? '#ef444433' : (log.status === 'skipped' ? `${C.muted}33` : C.border)}`, borderLeft: `4px solid ${sc}`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: `${sc}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                        {log.status === 'delivered' ? ICONS.check(14, sc) : log.status === 'failed' ? ICONS.error(14, sc) : ICONS.link(14, sc)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 800, color: C.text, display: 'flex', alignItems: 'center', gap: 6, background: `${C.sidebar}AA`, padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.border}66` }}>
                            {log.source === 'slack' ? ICONS.slack(14, C.slack) : log.source === 'whatsapp' ? ICONS.whatsapp(14, C.wa) : ICONS.teams(14, C.teams)}
                            {isS ? resolveSlack(log.source_channel, log.source_channel) : log.source_channel}
                          </span>
                          {ICONS.arrowRight(12)}
                          <span style={{ fontSize: 12, fontWeight: 800, color: C.teams, display: 'flex', alignItems: 'center', gap: 6, background: `${C.sidebar}AA`, padding: '3px 8px', borderRadius: 6, border: `1px solid ${C.border}66` }}>
                            {log.destination === 'slack' ? ICONS.slack(14, C.slack) : ICONS.teams(14, C.teams)}
                            {isD ? resolveSlack(log.dest_channel, log.dest_channel) : log.dest_channel}
                          </span>
                        </div>
                        {log.message_preview && <div style={{ fontSize: 12, color: C.text, marginBottom: 6, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>"{clean(log.message_preview)}"</div>}
                        {log.media_urls && parseLinks(log.media_urls).length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto', paddingBottom: 4 }}>
                            {parseLinks(log.media_urls).map((url, i) => (
                              <img key={i} src={proxyUrl(url)} alt="log attachment" style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', border: `1px solid ${C.border}` }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                            ))}
                          </div>
                        )}
                        {log.error_reason && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠️ {log.error_reason}</div>}
                      </div>
                      <div style={{ fontSize: 11, color: C.dim, flexShrink: 0, textAlign: 'right' }}>{log.forwarded_at ? new Date(log.forwarded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
