'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';

interface ChannelSummary {
  channel_id: string;
  source: string;
  channel_name: string;
  summary_text: string;
  message_count: number;
  last_updated: string;
  image_urls?: string[];
}

type SummariesSectionProps = {
  C: Record<string, string>;
  ICONS: {
    slack: (size?: number, color?: string) => React.ReactNode;
    whatsapp: (size?: number, color?: string) => React.ReactNode;
    teams: (size?: number, color?: string) => React.ReactNode;
    link: (size?: number, color?: string) => React.ReactNode;
    sparkle: (size?: number, color?: string) => React.ReactNode;
  };
  HourSeparator: React.ComponentType<{ label: string }>;
  getHourLabel: (iso: string) => string;
  formatDate: (iso: string) => string;
  resolveSlack: (id: string, name: string) => string;
};

export function SummariesSection(props: SummariesSectionProps) {
  const { C, ICONS, HourSeparator, getHourLabel, formatDate, resolveSlack } = props;
  const [summaries, setSummaries] = useState<ChannelSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dismissing, setDismissing] = useState<string | null>(null);

  const getPythonApiCandidates = useCallback(() => {
    const configured = process.env.NEXT_PUBLIC_PYTHON_API_URL;
    if (configured) return [configured];
    if (typeof window === 'undefined') return ['http://localhost:8000'];
    const host = window.location.hostname;
    const primary = `http://${host}:8000`;
    const localFallback = ['localhost', '127.0.0.1'].includes(host) ? ['http://localhost:8000', 'http://127.0.0.1:8000'] : [];
    return [primary, ...localFallback];
  }, []);

  const fetchFromPython = useCallback(
    async (path: string, init?: RequestInit) => {
      const candidates = getPythonApiCandidates();
      let lastError: unknown = null;
      for (const base of candidates) {
        try {
          const response = await fetch(`${base}${path}`, init);
          return response;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error('Python API request failed');
    },
    [getPythonApiCandidates]
  );

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchFromPython('/summaries');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const sorted = (data.summaries || []).sort((a: ChannelSummary, b: ChannelSummary) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
      setSummaries(sorted);
    } catch (err) {
      console.error('[Summaries]', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFromPython]);

  useEffect(() => {
    fetchSummaries();
  }, [fetchSummaries]);

  const triggerRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchFromPython('/summarize/all', { method: 'POST' });
      await fetchSummaries();
    } catch (err) {
      console.error('[Summarize]', err);
    } finally {
      setRefreshing(false);
    }
  };

  const dismissSummary = async (source: string, channelId: string) => {
    const key = `${source}:${channelId}`;
    setDismissing(key);
    try {
      await fetchFromPython(`/summary/${source}/${encodeURIComponent(channelId)}/dismiss`, { method: 'POST' });
      setSummaries((prev) => prev.filter((s) => !(s.source === source && s.channel_id === channelId)));
    } catch (err) {
      console.error('[Dismiss]', err);
    } finally {
      setDismissing(null);
    }
  };

  const sourceColor = (s: string) => (s === 'slack' ? C.slack : s === 'whatsapp' ? C.wa : s === 'teams' ? C.teams : C.accent);

  function parseExtraction(text: string) {
    if (!text || text.trim() === 'NO_ACTION' || text.startsWith('Extraction unavailable')) return { task: null, files: null, links: null, isEmpty: true };
    const taskBlockMatch = text.match(/^TASKS?:\s*([\s\S]*?)(?:\n(?:FILES:|LINKS:)|$)/im);
    const rawTask = taskBlockMatch?.[1]?.trim() || text.match(/^TASK:\s*(.+)$/m)?.[1]?.trim() || null;
    const rawFiles = text.match(/^FILES:\s*(.+)$/m)?.[1]?.trim() || null;
    const rawLinks = text.match(/^LINKS:\s*(.+)$/m)?.[1]?.trim() || null;
    const task = rawTask === 'NO_ACTION' ? null : rawTask;
    const links = rawLinks === 'NO_ACTION' ? null : rawLinks?.split(',').map((l) => l.trim()).filter((l) => /^https?:\/\//.test(l)).join(', ');
    const files = rawFiles === 'NO_ACTION' ? null : rawFiles?.split(',').map((f) => f.trim()).filter(Boolean).join(', ') || null;
    return { task, files, links, isEmpty: !task && !files && !links };
  }

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>Chat Summaries</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>AI-extracted tasks, files & links from recent messages per channel</div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={triggerRefresh} disabled={refreshing} style={{ background: `${C.accent}22`, border: `1px solid ${C.accent}44`, color: refreshing ? C.dim : C.accent, padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: refreshing ? 'not-allowed' : 'pointer' }}>
            {refreshing ? '⏳ Summarizing...' : '✦ Re-summarize All'}
          </button>
          <button onClick={fetchSummaries} disabled={loading} style={{ background: C.card, border: `1px solid ${C.border}`, color: loading ? C.dim : C.muted, padding: '7px 12px', borderRadius: 8, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[{ label: 'Total Channels', val: summaries.length, color: C.text }, { label: 'Teams', val: summaries.filter((s) => s.source === 'teams').length, color: C.teams }, { label: 'Slack + WhatsApp', val: summaries.filter((s) => s.source !== 'teams').length, color: C.accent }].map((stat) => (
          <div key={stat.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px' }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: stat.color }}>{stat.val}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 3, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
          </div>
        ))}
      </div>
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading summaries...</div>
      ) : summaries.length === 0 ? (
        <div style={{ textAlign: 'center', color: C.dim, padding: '60px 20px', background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📝</div>
          <div style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>No summaries yet</div>
          <div style={{ fontSize: 12, marginTop: 8, marginBottom: 16 }}>Click &quot;Re-summarize All&quot; to generate</div>
          <button onClick={triggerRefresh} style={{ background: `${C.accent}22`, border: `1px solid ${C.accent}44`, color: C.accent, padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>✦ Generate Now</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(() => {
            const items: React.ReactNode[] = [];
            let lastHour = '';
            summaries.forEach((s, i) => {
              const hourLabel = getHourLabel(s.last_updated);
              if (hourLabel !== lastHour) {
                items.push(<HourSeparator key={`sep-${i}`} label={hourLabel} />);
                lastHour = hourLabel;
              }
              const color = sourceColor(s.source);
              const { task, files, links, isEmpty } = parseExtraction(s.summary_text || '');
              const isDismissing = dismissing === `${s.source}:${s.channel_id}`;
              const images = (s.image_urls || []).filter(Boolean);
              const linkList = links ? links.split(',').map((l) => l.trim()).filter(Boolean) : [];
              const taskList = task
                ? task
                    .replace(/\r/g, '')
                    .split(/\n[•\-]\s*|;\s*|\n+/)
                    .map((t) => t.replace(/^TASKS?:\s*/i, '').trim())
                    .filter(Boolean)
                : [];
              const fileList = files ? files.split(',').map((f) => f.trim()).filter(Boolean) : [];
              const hasContent = !isEmpty || images.length > 0;
              items.push(
                <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20, opacity: isDismissing ? 0.4 : 1, transition: 'opacity 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: `${color}15`, border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {s.source === 'slack' ? ICONS.slack(16, color) : s.source === 'whatsapp' ? ICONS.whatsapp(16, color) : ICONS.teams(16, color)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{s.source === 'slack' ? resolveSlack(s.channel_id, s.channel_name) : s.channel_name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 3 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: `${color}15`, color, border: `1px solid ${color}33`, padding: '1px 7px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.source}</span>
                        <span style={{ fontSize: 11, color: C.dim }}>{s.message_count} messages</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>{s.last_updated ? formatDate(s.last_updated) : 'N/A'}</div>
                      <button onClick={() => dismissSummary(s.source, s.channel_id)} disabled={isDismissing} style={{ width: 26, height: 26, borderRadius: '50%', background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, fontSize: 13, cursor: isDismissing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onMouseEnter={(e) => { e.currentTarget.style.background = '#ef444422'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }} onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}>
                        ✕
                      </button>
                    </div>
                  </div>
                  {!hasContent ? (
                    <div style={{ background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 12, padding: '14px 18px', fontSize: 12, color: C.dim, fontStyle: 'italic', textAlign: 'center' }}>No actionable request found</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {task && (
                        <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}22`, borderRadius: 12, padding: '12px 16px', position: 'relative' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            {ICONS.sparkle(14, C.accent)}
                            <div style={{ fontSize: 11, fontWeight: 800, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Insight</div>
                          </div>
                          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>{taskList.length > 1 ? taskList.map((t, idx) => <div key={idx} style={{ marginBottom: idx === taskList.length - 1 ? 0 : 6 }}>• {t}</div>) : task}</div>
                        </div>
                      )}
                      {images.length > 0 && (
                        <div style={{ background: `${C.sidebar}66`, border: `1px solid ${C.border}44`, borderRadius: 12, padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>{ICONS.link(14, C.dim)} Attached Media</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {images.map((url, j) => (
                              <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}66`, flexShrink: 0, transition: 'transform 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')} onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}>
                                <img src={url} alt={`attachment-${j + 1}`} style={{ width: 100, height: 80, objectFit: 'cover', display: 'block' }} onError={(e) => { const p = (e.target as HTMLImageElement).parentElement; if (p) p.style.display = 'none'; }} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {fileList.length > 0 && (
                        <div style={{ background: `${C.sidebar}66`, border: `1px solid ${C.border}44`, borderRadius: 12, padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>{ICONS.link(14, C.dim)} Mentioned Files</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {fileList.map((f, j) => (
                              <div key={j} style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>
                                • {f}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {linkList.length > 0 && (
                        <div style={{ background: `${C.sidebar}66`, border: `1px solid ${C.border}44`, borderRadius: 12, padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>{ICONS.link(14, C.dim)} Referenced Links</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {linkList.map((l, j) => (
                              <a key={j} href={l} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.accent, textDecoration: 'none', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ICONS.link(10, C.accent)} {l}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            });
            return items;
          })()}
        </div>
      )}
    </div>
  );
}
