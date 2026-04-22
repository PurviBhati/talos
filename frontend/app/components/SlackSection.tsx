'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSharedStore } from '../store/useSharedStore';

interface SlackMessage {
  id: number;
  sender: string;
  body: string;
  timestamp: string;
  channel_id: string;
  channel_name: string;
  forwarded_to_teams: boolean;
  dismissed?: boolean;
  files?: { name: string; url: string; publicUrl?: string }[] | string;
}

type SlackSectionProps = {
  C: Record<string, string>;
  ICONS: {
    slack: (size?: number, color?: string) => React.ReactNode;
    teams: (size?: number, color?: string) => React.ReactNode;
  };
  API: string;
  SectionHeader: React.ComponentType<{ title: string; sub: string; onRefresh: () => void; loading: boolean }>;
  EmptyState: React.ComponentType<{ message?: string; type?: 'info' | 'success' | 'error' }>;
  Avatar: React.ComponentType<{ name: string }>;
  HourSeparator: React.ComponentType<{ label: string }>;
  LinkPreview: React.ComponentType<{ url: string }>;
  FileAttachment: React.ComponentType<{ file: { name: string; url: string; publicUrl?: string; contentType?: string } }>;
  Dropdown: React.ComponentType<{
    label: string;
    icon: React.ReactNode;
    color: string;
    options: { id: string; name: string }[];
    onSelect: (id: string, name: string) => void;
    disabled?: boolean;
  }>;
  parseFiles: (v: unknown) => { name: string; url: string; publicUrl?: string }[];
  clean: (h: string) => string;
  getHourLabel: (iso: string) => string;
  authHeaders: () => HeadersInit;
  apiFetchJson: <T>(input: string, init?: RequestInit) => Promise<T>;
};

export function SlackSection(props: SlackSectionProps) {
  const { C, ICONS, API, SectionHeader, EmptyState, Avatar, HourSeparator, LinkPreview, FileAttachment, Dropdown, parseFiles, clean, getHourLabel, authHeaders, apiFetchJson } = props;

  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const dismissed = useSharedStore((s) => s.dismissed.slack);
  const dismissMessage = useSharedStore((s) => s.dismissMessage);
  const teamsChats = useSharedStore((s) => s.teamsChats);
  const fetchTeamsChats = useSharedStore((s) => s.fetchTeamsChats);
  const [forwarding, setForwarding] = useState<Set<number>>(new Set());
  const [forwarded, setForwarded] = useState<Set<number>>(new Set());
  const [editMap, setEditMap] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetchJson<SlackMessage[]>(`${API}/api/slack/messages`, { headers: authHeaders() });
      setMessages(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load Slack messages';
      console.error('[Slack]', err);
      setError(message);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [API, apiFetchJson, authHeaders]);

  useEffect(() => {
    fetchMessages();
    fetchTeamsChats(API, authHeaders());
    const t = setInterval(fetchMessages, 20000);
    return () => clearInterval(t);
  }, [API, authHeaders, fetchMessages, fetchTeamsChats]);

  async function handleDismiss(id: number) {
    dismissMessage('slack', id);
    await fetch(`${API}/api/dismiss/slack/${id}`, { method: 'POST' }).catch(() => {});
  }

  async function handleForward(msg: SlackMessage, chatId: string) {
    setForwarding((p) => new Set([...p, msg.id]));
    const body = editingId === msg.id ? editMap[msg.id] || msg.body : msg.body;
    try {
      if (body) {
        await fetch(`${API}/api/slack/forward`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msgId: msg.id, chatId, editedBody: body }) });
      }
      const files = parseFiles(msg.files);
      for (const f of files) {
        const url = f.publicUrl || f.url;
        if (url) await fetch(`${API}/api/slack/forward-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msg.id, chatId, publicUrl: url, caption: f.name }) });
      }
      setForwarded((p) => new Set([...p, msg.id]));
      setTimeout(() => dismissMessage('slack', msg.id), 1500);
      setEditingId(null);
    } catch (err) {
      console.error('[Slack forward]', err);
    } finally {
      setForwarding((p) => {
        const n = new Set(p);
        n.delete(msg.id);
        return n;
      });
    }
  }

  const visible = messages.filter((m) => !dismissed.has(m.id) && !m.dismissed);

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <SectionHeader title="Slack Messages" sub="Forward Slack messages to Microsoft Teams" onRefresh={fetchMessages} loading={loading} />
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : error ? (
        <EmptyState message={error} type="error" />
      ) : visible.length === 0 ? (
        <EmptyState message="No Slack messages" />
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
              const isForwarded = forwarded.has(msg.id) || msg.forwarded_to_teams;
              const isForwarding = forwarding.has(msg.id);
              const isEditing = editingId === msg.id;
              const files = parseFiles(msg.files);
              items.push(
                <div key={msg.id} className="card-wrapper" style={{ background: C.card, borderLeft: `4px solid ${C.slack}`, borderRight: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, borderRadius: 16, padding: 20, position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 0 }}>
                  <button onClick={() => handleDismiss(msg.id)} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, opacity: 0.5 }}>
                    ✕
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, paddingRight: 40 }}>
                    <Avatar name={msg.sender} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{msg.sender}</div>
                      <div style={{ fontSize: 11, color: C.slack, marginTop: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {ICONS.slack(12, C.slack)} {msg.channel_name || msg.channel_id}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>{new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                  </div>
                  {isEditing ? (
                    <textarea value={editMap[msg.id] ?? msg.body} onChange={(e) => setEditMap((p) => ({ ...p, [msg.id]: e.target.value }))} style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', color: C.text, fontSize: 13, resize: 'vertical', marginBottom: 12, minHeight: 80, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
                  ) : msg.body ? (
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.4, marginBottom: files.length ? 12 : 0 }}>
                      {clean(msg.body)}
                      {(() => {
                        const urlMatch = msg.body.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/);
                        if (urlMatch) return <LinkPreview url={urlMatch[0]} />;
                        return null;
                      })()}
                    </div>
                  ) : null}
                  {files.map((f, i) => (
                    <FileAttachment key={i} file={f} />
                  ))}
                  <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                    {isForwarded ? (
                      <span style={{ fontSize: 12, color: C.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>✓ Forwarded</span>
                    ) : (
                      <>
                        <Dropdown label={isForwarding ? 'Forwarding...' : 'Forward to Teams'} icon={ICONS.teams(14, '#fff')} color={C.teams} options={teamsChats.map((c) => ({ id: c.id, name: c.name }))} onSelect={(id) => handleForward(msg, id)} disabled={isForwarding} />
                        <button onClick={() => (isEditing ? setEditingId(null) : (setEditingId(msg.id), setEditMap((p) => ({ ...p, [msg.id]: p[msg.id] ?? msg.body }))))} style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, padding: '6px 0', borderBottom: '1.5px dashed #f59e0b', opacity: 0.8, transition: 'opacity 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')} onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.8')}>
                          {isEditing ? 'Cancel Edit' : 'Edit Message'}
                        </button>
                      </>
                    )}
                  </div>
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
