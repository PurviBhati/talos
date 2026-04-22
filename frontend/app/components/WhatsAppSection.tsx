'use client';
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useState } from 'react';
import { useSharedStore } from '../store/useSharedStore';

interface WhatsAppMessage {
  id: number;
  sender: string;
  sender_phone: string;
  body: string;
  timestamp: string;
  forwarded_to_teams?: boolean;
  group_name?: string;
  dismissed?: boolean;
  media_urls?: string | string[];
}

type WhatsAppSectionProps = {
  C: Record<string, string>;
  ICONS: {
    whatsapp: (size?: number, color?: string) => React.ReactNode;
    teams: (size?: number, color?: string) => React.ReactNode;
    link: (size?: number, color?: string) => React.ReactNode;
  };
  API: string;
  SectionHeader: React.ComponentType<{ title: string; sub: string; onRefresh: () => void; loading: boolean }>;
  EmptyState: React.ComponentType<{ message?: string; type?: 'info' | 'success' | 'error' }>;
  Avatar: React.ComponentType<{ name: string }>;
  HourSeparator: React.ComponentType<{ label: string }>;
  LinkPreview: React.ComponentType<{ url: string }>;
  Dropdown: React.ComponentType<{
    label: string;
    icon: React.ReactNode;
    color: string;
    options: { id: string; name: string }[];
    onSelect: (id: string, name: string) => void;
    disabled?: boolean;
  }>;
  parseLinks: (v: unknown) => string[];
  clean: (h: string) => string;
  getHourLabel: (iso: string) => string;
  isImageFile: (name: string, url: string) => boolean;
  authHeaders: () => HeadersInit;
  apiFetchJson: <T>(input: string, init?: RequestInit) => Promise<T>;
};

export function WhatsAppSection(props: WhatsAppSectionProps) {
  const { C, ICONS, API, SectionHeader, EmptyState, Avatar, HourSeparator, LinkPreview, Dropdown, parseLinks, clean, getHourLabel, isImageFile, authHeaders, apiFetchJson } = props;

  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const dismissed = useSharedStore((s) => s.dismissed.whatsapp);
  const dismissMessage = useSharedStore((s) => s.dismissMessage);
  const teamsChats = useSharedStore((s) => s.teamsChats);
  const fetchTeamsChats = useSharedStore((s) => s.fetchTeamsChats);
  const [forwarding, setForwarding] = useState<Set<number>>(new Set());
  const [forwarded, setForwarded] = useState<Set<number>>(new Set());
  const [editMap, setEditMap] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState('');

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetchJson<WhatsAppMessage[]>(`${API}/api/whatsapp/messages`, { headers: authHeaders() });
      setMessages(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load WhatsApp messages';
      console.error('[WhatsApp]', err);
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
    dismissMessage('whatsapp', id);
    await fetch(`${API}/api/dismiss/whatsapp/${id}`, { method: 'POST' }).catch(() => {});
  }

  async function handleForward(msg: WhatsAppMessage, chatId: string) {
    setForwarding((p) => new Set([...p, msg.id]));
    const body = editingId === msg.id ? editMap[msg.id] || msg.body : msg.body;
    try {
      if (body) await apiFetchJson(`${API}/api/whatsapp/forward`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ msgId: msg.id, chatId, editedBody: body }) });
      const mediaUrls = parseLinks(msg.media_urls);
      for (const url of mediaUrls) {
        await apiFetchJson(`${API}/api/whatsapp/forward-image`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ messageId: msg.id, chatId, mediaUrl: url }) });
      }
      setForwarded((p) => new Set([...p, msg.id]));
      setTimeout(() => dismissMessage('whatsapp', msg.id), 1500);
      setEditingId(null);
    } catch (err) {
      console.error('[WA forward]', err);
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
      <SectionHeader title="WhatsApp Messages" sub="Forward WhatsApp messages to Microsoft Teams" onRefresh={fetchMessages} loading={loading} />
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : error ? (
        <EmptyState message={error} type="error" />
      ) : visible.length === 0 ? (
        <EmptyState message="No WhatsApp messages" />
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
              const mediaUrls = parseLinks(msg.media_urls);
              items.push(
                <div key={msg.id} className="card-wrapper" style={{ background: C.card, borderLeft: `4px solid ${C.wa}`, borderRight: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, borderRadius: 16, padding: 20, position: 'relative', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 0 }}>
                  <button onClick={() => handleDismiss(msg.id)} style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, opacity: 0.5 }}>
                    ✕
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, paddingRight: 40 }}>
                    <Avatar name={msg.sender} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{msg.sender || 'Unknown'}</div>
                      <div style={{ fontSize: 11, color: C.wa, marginTop: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {ICONS.whatsapp(12, C.wa)} {msg.sender}
                        {msg.group_name ? ` · ${msg.group_name}` : ''}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>{new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                  </div>
                  {isEditing ? (
                    <textarea value={editMap[msg.id] ?? msg.body} onChange={(e) => setEditMap((p) => ({ ...p, [msg.id]: e.target.value }))} style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', color: C.text, fontSize: 13, resize: 'vertical', marginBottom: 12, minHeight: 80, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
                  ) : msg.body ? (
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, marginBottom: mediaUrls.length ? 10 : 8 }}>
                      {clean(msg.body)}
                      {(() => {
                        const urlMatch = msg.body.match(/https?:\/\/[^\s<>"{}|\\^`[\]]+/);
                        if (urlMatch) return <LinkPreview url={urlMatch[0]} />;
                        return null;
                      })()}
                    </div>
                  ) : null}
                  {mediaUrls.map((url, i) =>
                    isImageFile('', url) ? (
                      <img key={i} src={url} alt="media" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10, display: 'block', marginBottom: 10, border: `1px solid ${C.border}44` }} onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />
                    ) : (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600 }}>
                        {ICONS.link(12, C.accent)} View Attachment
                      </a>
                    )
                  )}
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
