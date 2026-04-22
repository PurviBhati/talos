'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSharedStore } from '../store/useSharedStore';

interface TeamsMessage {
  id: number;
  sender: string;
  body: string;
  timestamp: string;
  source_type: string;
  source_id: string;
  files: string | { name: string; url: string; publicUrl?: string }[];
  links: string | string[];
  chat_name?: string;
  dismissed?: boolean;
}

type TeamsSectionProps = {
  C: Record<string, string>;
  ICONS: {
    teams: (size?: number, color?: string) => React.ReactNode;
    link: (size?: number, color?: string) => React.ReactNode;
  };
  API: string;
  SectionHeader: React.ComponentType<{ title: string; sub: string; onRefresh: () => void; loading: boolean }>;
  EmptyState: React.ComponentType<{ message?: string; type?: 'info' | 'success' | 'error' }>;
  Avatar: React.ComponentType<{ name: string }>;
  HourSeparator: React.ComponentType<{ label: string }>;
  LinkPreview: React.ComponentType<{ url: string }>;
  FileAttachment: React.ComponentType<{ file: { name: string; url: string; publicUrl?: string; contentType?: string } }>;
  parseFiles: (v: unknown) => { name: string; url: string; publicUrl?: string }[];
  parseLinks: (v: unknown) => string[];
  clean: (h: string) => string;
  getHourLabel: (iso: string) => string;
  authHeaders: () => HeadersInit;
  apiFetchJson: <T>(input: string, init?: RequestInit) => Promise<T>;
};

export function TeamsSection(props: TeamsSectionProps) {
  const { C, ICONS, API, SectionHeader, EmptyState, Avatar, HourSeparator, LinkPreview, FileAttachment, parseFiles, parseLinks, clean, getHourLabel, authHeaders, apiFetchJson } = props;

  const [messages, setMessages] = useState<TeamsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const dismissed = useSharedStore((s) => s.dismissed.teams);
  const dismissMessage = useSharedStore((s) => s.dismissMessage);
  const [error, setError] = useState('');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetchJson<TeamsMessage[]>(`${API}/api/teams/messages/chats`, { headers: authHeaders() });
      setMessages(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load Teams messages';
      console.error('[Teams]', err);
      setError(message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [API, apiFetchJson, authHeaders]);

  useEffect(() => {
    fetchMessages();
    const t = setInterval(fetchMessages, 20000);
    return () => clearInterval(t);
  }, [fetchMessages]);

  async function handleDismiss(id: number) {
    dismissMessage('teams', id);
    await apiFetchJson(`${API}/api/teams/messages/${id}/dismiss`, { method: 'PATCH', headers: authHeaders() }).catch(() => {});
  }

  const visible = messages.filter((m) => !dismissed.has(m.id) && !m.dismissed);

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <SectionHeader title="Teams Messages" sub="Incoming messages from monitored group chats" onRefresh={fetchMessages} loading={loading} />
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : error ? (
        <EmptyState message={error} type="error" />
      ) : visible.length === 0 ? (
        <EmptyState message="No Teams messages" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(() => {
            const items: React.ReactNode[] = [];
            let lastHour = '';
            visible.forEach((msg) => {
              const hour = getHourLabel(msg.timestamp);
              if (hour !== lastHour) {
                items.push(<HourSeparator key={`sep-${msg.id}`} label={hour} />);
                lastHour = hour;
              }
              const files = parseFiles(msg.files);
              const links = parseLinks(msg.links);
              items.push(
                <div key={msg.id} className="card-wrapper" style={{ background: C.card, borderLeft: `4px solid ${C.teams}`, borderRight: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, borderRadius: 16, padding: 20, position: 'relative', transition: 'all 0.2s', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 0 }}>
                  <button onClick={() => handleDismiss(msg.id)} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, opacity: 0.5, transition: 'opacity 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.5')}>
                    ✕
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, paddingRight: 40 }}>
                    <Avatar name={msg.sender} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{msg.sender}</div>
                      <div style={{ fontSize: 11, color: C.teams, marginTop: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6, textShadow: `0 0 10px ${C.teams}55` }}>
                        {ICONS.teams(12, C.teams)} {msg.chat_name || 'Teams Chat'}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>{new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                  </div>
                  {msg.body && (
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: files.length || links.length ? 14 : 0 }}>
                      {clean(msg.body)}
                      {(() => {
                        const urlMatch = msg.body.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/);
                        if (urlMatch) {
                          const decodedUrl = urlMatch[0].replace(/&amp;/g, '&');
                          return <LinkPreview url={decodedUrl} />;
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  {files.map((f, i) => (
                    <FileAttachment key={i} file={f} />
                  ))}
                  {links.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {links.map((l, i) => (
                        <a key={i} href={l} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.accent, textDecoration: 'none', opacity: 0.9, fontWeight: 500 }}>
                          {ICONS.link(12, C.accent)} {l}
                        </a>
                      ))}
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
