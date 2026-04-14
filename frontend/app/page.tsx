'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities, react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useEffect, useState, useCallback, useRef } from 'react';

const API =
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined'
    ? `http://${window.location.hostname}:5000`
    : 'http://localhost:5000');
const PYTHON_API =
  process.env.NEXT_PUBLIC_PYTHON_API_URL ||
  (typeof window !== 'undefined'
    ? `http://${window.location.hostname}:8000`
    : 'http://localhost:8000');

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.id = 'theme-variables';
  style.innerHTML = `
    * { box-sizing: border-box; }
    html, body { 
      margin: 0; padding: 0; overflow-x: hidden; width: 100%; 
      background: var(--c-bg); 
      color: var(--c-text);
      transition: background 0.3s, color 0.3s;
    }
    ::-webkit-scrollbar { width: 8px; height: 8px; }
    ::-webkit-scrollbar-track { background: var(--c-sidebar); }
    ::-webkit-scrollbar-thumb { background: var(--c-border); border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: var(--c-accent); }
    
    /* Custom utility for glassmorphism in light mode */
    .glass-card {
      background: var(--c-card);
      backdrop-filter: blur(8px);
      border: 1px solid var(--c-border);
    }

    @media (max-width: 900px) {
      .section-header {
        padding-left: 44px; /* keep title clear of floating menu button */
      }
      .gov-card-head {
        flex-wrap: wrap;
        align-items: flex-start !important;
      }
      .gov-card-meta {
        width: 100%;
        margin-top: 6px;
        align-items: flex-start !important;
      }
    }

    @media (max-width: 640px) {
      .admin-grid {
        grid-template-columns: 1fr !important;
        gap: 12px !important;
      }
      .admin-card {
        padding: 12px !important;
        border-radius: 14px !important;
      }
      .admin-heading {
        font-size: 20px !important;
        line-height: 1.2;
        overflow-wrap: anywhere;
      }
      .admin-kv {
        flex-direction: column !important;
        align-items: flex-start !important;
      }
      .admin-kv-value {
        overflow-wrap: anywhere;
        word-break: break-word;
      }
    }
  `;
  document.head.appendChild(style);
}

const THEMES = {
  dark: {
    bg: '#2c594eff', // Deeper Obsidian Green
    sidebar: '#112b25', // Satin Dark Green
    card: '#163832', // Emerald Panel
    cardHover: '#1d453d',
    border: '#56ac96ff',
    accent: '#10b981', // True Emerald
    text: '#f2fff4',
    muted: '#a7c9b3',
    dim: '#91cfb5ff',
    slack: '#ec412eff',
    wa: '#25D366',
    teams: '#5E5CE6',
  },
  light: {
    bg: '#d3e9e1ff', // Soft Mint
    sidebar: '#8bcea9ff', // Sage Green
    card: '#ffffff', // White
    cardHover: '#f8fcfb',
    border: '#00712dff',
    accent: '#059669', // Darker Emerald for readability
    text: '#112b25', // Forest Green
    muted: '#4b7a69',
    dim: '#6a8e83',
    slack: '#ec412eff',
    wa: '#128C7E', // WhatsApp Darker Green
    teams: '#4B53BC',
  }
};

const C = {
  bg: 'var(--c-bg)',
  sidebar: 'var(--c-sidebar)',
  card: 'var(--c-card)',
  cardHover: 'var(--c-cardHover)',
  border: 'var(--c-border)',
  accent: 'var(--c-accent)',
  text: 'var(--c-text)',
  textSoft: 'var(--c-text-soft)',
  muted: 'var(--c-muted)',
  dim: 'var(--c-dim)',
  slack: 'var(--c-slack)',
  wa: 'var(--c-wa)',
  teams: 'var(--c-teams)',
};

const SLACK_MAP: Record<string, string> = {
  "C0AHE5C59NH": "#privateopenclawdemo",
  "C0AHHG10HDG": "#openclawtest",
  "C0AH24BPHRD": "#testdemo",
};

const resolveSlack = (id: string, name: string) => SLACK_MAP[id] || SLACK_MAP[name] || name || id;

const authHeaders = (): HeadersInit => {
  const headers: Record<string, string> = {};
  if (typeof window === 'undefined') return headers;
  const token = localStorage.getItem('token');
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
};

const ICONS = {
  slack: (size = 16, color = '#E01E5A') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3.7 10.3c0 .9-.71 1.63-1.58 1.63-.88 0-1.58-.73-1.58-1.63 0-.9.7-1.63 1.58-1.63h1.58v1.63zM4.75 10.3c0-.9.71-1.63 1.58-1.63.88 0 1.58.73 1.58 1.63v4.07c0 .9-.7 1.63-1.58 1.63-.87 0-1.58-.73-1.58-1.63v-4.07zM5.7 3.7c-.9 0-1.63-.71-1.63-1.58 0-.88.73-1.58 1.63-1.58.9 0 1.63.7 1.63 1.58v1.58H5.7zM5.7 4.75c.9 0 1.63.71 1.63 1.58 0 .88-.73 1.58-1.63 1.58H1.63C.76 7.91 0 7.2 0 6.33c0-.87.73-1.58 1.63-1.58h4.07zM12.3 5.7c0-.9.71-1.63 1.58-1.63.88 0 1.58.73 1.58 1.63 0 .9-.7 1.63-1.58 1.63h-1.58V5.7zM11.25 5.7c0 .9-.71 1.63-1.58 1.63-.88 0-1.58-.73-1.58-1.63V1.63c0-.9.7-1.63 1.58-1.63.87 0 1.58.73 1.58 1.63V5.7zM10.3 12.3c.9 0 1.63.71 1.63 1.58 0 .88-.73 1.58-1.63 1.58-.9 0-1.63-.7-1.63-1.58v-1.58h1.63zM10.3 11.25c-.9 0-1.63-.71-1.63-1.58 0-.88.73-1.58 1.63-1.58h4.07c.87 0 1.6.73 1.6 1.58 0 .87-.73 1.58-1.63 1.58h-4.07z" fill={color} />
    </svg>
  ),
  whatsapp: (size = 16, color = '#25D366') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M12.11 9.47c-.2-.1-.1.1-.73-.2-.55-.3-.65-.3-.92-.03-.23.23-.48.5-.6.67-.02.04-.05.1-.1.08C8.94 9.68 7.37 8.3 6.64 7.42c-.08-.1-.13-.17-.18-.23-.05-.07.03-.13.04-.15.15-.17.3-.33.45-.5.06-.08.13-.15.2-.23.05-.05.07-.12.03-.18-.04-.08-.33-.78-.45-1.07-.12-.28-.24-.28-.35-.28H6c-.15 0-.3.05-.4.17-.4.5-.63 1-.63 1.57 0 1.13.5 2.18.7 2.45.02.03 1.14 1.74 2.76 2.44.38.16.68.26.92.34.38.12.73.1.1.1.42-.06 1.3-.53 1.48-1.05.18-.5.18-.94.13-1.03-.04-.08-.16-.13-.36-.23zM8 0a8 8 0 0 0-6.85 12.13L0 16l3.96-1.03a7.99 7.99 0 0 0 12.04-6.97A8 8 0 0 0 8 0z" />
    </svg>
  ),
  teams: (size = 16, color = '#5E5CE6') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color} xmlns="http://www.w3.org/2000/svg">
      <path d="M4.46 3.19C3.12 3.19 2 4.3 2 5.67v4.66c0 1.37 1.12 2.48 2.46 2.48h2.32c.5 0 .97-.15 1.36-.42a13.3 13.3 0 0 1-1.36-.6 1.36 1.36 0 0 1-.8-.8V5.01c0-.4.18-.76.47-1.01A2.52 2.52 0 0 0 4.46 3.19zM8.88 1.19c-1.37 0-2.48 1.11-2.48 2.48v8.66c0 1.37 1.11 2.48 2.48 2.48h2.66c1.37 0 2.48-1.11 2.48-2.48V3.67c0-1.37-1.11-2.48-2.48-2.48H8.88zm3.01 4.5h-.7V4.99c0-.2.15-.35.35-.35s.35.15.35.35v.7zM8.83 4.64h.7c.19 0 .35.15.35.35v.7h-.7v-.7c0-.2.15-.35.35-.35z" />
    </svg>
  ),
  link: (size = 12, color = '#10b981') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54-7.06l-1.54 1.54a2.82 2.82 0 0 1-4 4l1.54-1.54L10 13zM6 3a5 5 0 0 0-7.54 7.06l1.54-1.54a2.82 2.82 0 0 1 4-4l-1.54 1.54L6 3z" />
      <line x1="7" y1="9" x2="9" y2="7" />
    </svg>
  ),
  sparkle: (size = 14, color = '#10b981') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
      <path d="M8 0L9.5 5.5L15 7L9.5 8.5L8 14L6.5 8.5L1 7L6.5 5.5L8 0Z" />
    </svg>
  ),
  governance: (size = 18, color = '#10b981') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1L1 4v5a7 7 0 0 0 7 7 7 7 0 0 0 7-7V4l-7-3z" />
    </svg>
  ),
  taskPlanner: (size = 18, color = '#a7c9b3') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z" />
      <path d="M6 6h4M6 10h4" />
    </svg>
  ),
  log: (size = 18, color = '#a7c9b3') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 8a7 7 0 1 0 14 0A7 7 0 0 0 1 8z" />
      <path d="M12 8a4 4 0 1 1-8 0 4 4 0 0 1 8 0z" />
      <path d="M8 8.01L8 8" />
    </svg>
  ),
  admin: (size = 18, color = '#a7c9b3') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M15.4 9.2L14 8.7c-.1-.4-.3-.7-.5-1l.7-1.3c.2-.3.1-.7-.2-.9l-1.2-1.2c-.2-.2-.6-.3-.9-.2L10.6 6c-.3-.2-.6-.4-1-.5L9.1 4c-.1-.3-.4-.6-.8-.6H6.7c-.4 0-.7.3-.8.6L5.4 5.5c-.4.1-.7.3-1 .5L3.1 5.3c-.3-.2-.7-.1-.9.2L1 6.7c-.2.2-.3.6-.2.9l.7 1.3c-.2.3-.4.6-.5 1L0.6 10.4c-.3.1-.6.4-.6.8V12c0 .4.3.7.6.8l1.3.1c.1.4.3.7.5 1l-.7 1.3c-.2.3-.1.7.2.9l1.2 1.2c.2.2.6.3.9.2L5.4 15c.3.2.6.4 1 .5l.1 1.4c.1.3.4.6.8.6h1.6c.4 0 .7-.3.8-.6l.1-1.4c.4-.1.7-.3 1-.5l1.3.7c.3.2.7.1.9-.2l1.2-1.2c.2-.2.3-.6.2-.9l-.7-1.3c.2-.3.4-.6.5-1l1.4-.1c.3-.1.6-.4.6-.8V10.4c0-.4-.3-.7-.6-.8z" />
    </svg>
  ),
  moon: (size = 18, color = C.muted) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ),
  sun: (size = 18, color = C.muted) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  ),
  summaries: (size = 18, color = '#a7c9b3') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6L9 1z" />
      <path d="M9 1v5h5" />
    </svg>
  ),
  check: (size = 14, color = '#10b981') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="13 4 7 10 4 7" />
    </svg>
  ),
  error: (size = 14, color = '#ef4444') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="7" />
      <line x1="8" y1="5.5" x2="8" y2="8.5" />
      <line x1="8" y1="11" x2="8.01" y2="11" />
    </svg>
  ),
  arrowRight: (size = 12, color = '#a7c9b3') => (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8h10M10 5l3 3-3 3" />
    </svg>
  ),
  logo: (size = 22, color = '#10b981') => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  )
};

interface Draft {
  id: number;
  sender: string;
  source_type: string;
  original_body: string;
  content: string;
  message_type: string;
  priority: string;
  ai_reasoning: string;
  approval_status: string;
  suggested_platform: string;
  files: string;
  chat_name: string;
  recipient_slack_id: string;
  recipient_whatsapp: string;
  approved_draft: string;
  created_at: string;
}

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

interface TeamsChat {
  id: string;
  name: string;
}

interface WAGroup {
  id: string;
  name: string;
}

interface ChannelSummary {
  channel_id: string;
  source: string;
  channel_name: string;
  summary_text: string;
  message_count: number;
  last_updated: string;
  image_urls?: string[];
}

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

// ─── Shared Components & Types ───────────────────────────────────────────────
function LinkPreview({ url }: { url: string }) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    fetch(`${API}/api/link-preview?url=${encodeURIComponent(url)}`)
      .then(r => r.json())
      .then(d => { if (active) { setData(d); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [url]);

  if (loading || !data || data.error) return null;

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      style={{ display: 'flex', background: `${C.sidebar}44`, border: `1px solid ${C.border}66`, borderRadius: 12, overflow: 'hidden', marginTop: 10, textDecoration: 'none', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
      onMouseLeave={e => e.currentTarget.style.borderColor = `${C.border}66`}>
      {data.image && (
        <div style={{ width: 100, flexShrink: 0, borderRight: `1px solid ${C.border}44` }}>
          <img src={data.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { (e.target as HTMLImageElement).parentElement!.style.display = 'none'; }} />
        </div>
      )}
      <div style={{ padding: '10px 14px', flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{data.title}</div>
        {data.description && <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{data.description}</div>}
        <div style={{ fontSize: 10, color: C.accent, marginTop: 6, fontWeight: 600 }}>{new URL(url).hostname}</div>
      </div>
    </a>
  );
}
function HourSeparator({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 8px' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      <div style={{ fontSize: 11, color: C.dim, fontWeight: 700, whiteSpace: 'nowrap', padding: '3px 10px', background: C.sidebar, borderRadius: 20, border: `1px solid ${C.border}`, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {label}
      </div>
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  );
}

function getHourLabel(iso: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date();
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();

  let prefix = '';
  if (isToday) prefix = 'Today at ';
  else if (isYesterday) prefix = 'Yesterday at ';
  else prefix = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) + ' at ';

  const hours = d.getHours();
  return prefix + (hours < 10 ? '0' + hours : hours) + ':00';
}

interface Task {
  id: number;
  source: string;
  client_name: string;
  platform_label: string;
  body: string;
  links: string | string[];
  images: string | string[];
  status: string;
  created_at: string;
  teams_task_id?: string;
}

function clean(h: string) {
  if (!h) return '';
  return h
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/https?:\/\/[^\s]+?\.(png|jpg|jpeg|gif|webp|svg)(\?[^\s]+)?/gi, '') // Strip image URLs
    .replace(/image_[a-zA-Z0-9]{10,}\.(png|jpg|jpeg|gif|webp)/gi, '') // Strip messy system image names
    .replace(/\[image\]/gi, '') // Remove the [image] marker entirely
    .replace(/<img[^>]*>/gi, '') // Remove <img> tags
    .replace(/<[^>]*>/g, '')      // Strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n') // Normalize multiple newlines
    .trim();
}

type NavSection = 'governance' | 'teams' | 'slack' | 'whatsapp' | 'tasks' | 'admin' | 'settings' | 'summaries' | 'forward-log';

const SLACK_CHANNELS = [
  { id: 'C0AHHG10HDG', name: '#openclawtest' },
  { id: 'C0AH24BPHRD', name: '#testdemo' },
  { id: 'C0AHE5C59NH', name: '#privateopenclawdemo' },
];

function getInitials(name: string) {
  return (name || '?').split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}
function getAvatarColor(name: string) {
  const colors = ['#235347', '#2e6b55', '#1a4d3e', '#2d5a4a', '#3a7060', '#1e4035'];
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
}
function parseFiles(v: any): { name: string; url: string; publicUrl?: string }[] {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v) || []; } catch { return []; }
}
function parseLinks(v: any): string[] {
  if (Array.isArray(v)) return v;
  try { return JSON.parse(v) || []; } catch { return []; }
}
function isImageFile(name: string, url: string) {
  const combined = (name || '') + '|' + (url || '');
  return /\.(png|jpg|jpeg|gif|webp|svg)(\?.*)?$/i.test(combined);
}
function proxyUrl(url: string) {
  if (!url) return url;
  if (url.includes('supabase') || url.startsWith('http://localhost')) return url;
  return `${API}/api/files/proxy?url=${encodeURIComponent(url)}`;
}

function Avatar({ name }: { name: string }) {
  return (
    <div style={{ width: 34, height: 34, borderRadius: 10, background: getAvatarColor(name), border: `2px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: C.text, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
      {getInitials(name)}
    </div>
  );
}

function SectionHeader({ title, sub, onRefresh, loading }: { title: string; sub: string; onRefresh: () => void; loading: boolean }) {
  const icon = title.toLowerCase().includes('slack') ? ICONS.slack(24) :
    title.toLowerCase().includes('whatsapp') ? ICONS.whatsapp(24) :
      title.toLowerCase().includes('teams') ? ICONS.teams(24) : null;

  return (
    <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
        {icon && <div style={{ background: `${C.sidebar}AA`, padding: 10, borderRadius: 12, border: `1px solid ${C.border}66` }}>{icon}</div>}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', wordBreak: 'break-word' }}>{title}</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{sub}</div>
        </div>
      </div>
      <button onClick={onRefresh} disabled={loading}
        style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}33`, color: loading ? C.muted : C.accent, padding: '10px 20px', borderRadius: 10, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, transition: 'all 0.2s' }}>
        {loading ? 'Refreshing...' : '↻ Refresh'}
      </button>
    </div>
  );
}

function EmptyState({ message = 'No messages', type = 'info' }: { message?: string, type?: 'info' | 'success' }) {
  return (
    <div style={{ textAlign: 'center', color: C.dim, padding: '60px 20px', background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {type === 'success' ? ICONS.check(32, C.accent) : ICONS.logo(32, C.dim)}
      <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{message}</div>
    </div>
  );
}

function FileAttachment({ file }: { file: { name: string; url: string; publicUrl?: string; contentType?: string } }) {
  const src = file.publicUrl || proxyUrl(file.url);
  const isImg =
    isImageFile(file.name, file.url) ||
    isImageFile('', file.publicUrl || '') ||
    file.contentType?.startsWith('image/') ||
    /\.(jpg|jpeg|png|gif|webp|svg)(\?|$)/i.test(src);

  let displayName = file.name?.startsWith('http')
    ? (file.publicUrl?.split('/').pop() || 'image.jpg')
    : file.name;

  // Truncate long system/base64 filenames shown in the screenshot
  if (displayName?.length > 30) {
    displayName = displayName.slice(0, 15) + '...' + displayName.slice(-8);
  }

  const ext = displayName?.split('.').pop()?.toUpperCase() || (isImg ? 'IMG' : 'FILE');

  return (
    <div style={{ background: `${C.sidebar}66`, border: `1px solid ${C.border}66`, borderRadius: 10, padding: '10px 14px', marginBottom: 10, backdropFilter: 'blur(4px)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ background: `${C.accent}15`, color: C.accent, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 6, flexShrink: 0, border: `1px solid ${C.accent}33` }}>{ext}</span>
        <div style={{ flex: 1, fontSize: 12, color: C.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{displayName}</div>
        <a href={src} target="_blank" rel="noopener noreferrer"
          style={{ color: C.accent, fontSize: 11, fontWeight: 700, textDecoration: 'none', flexShrink: 0, opacity: 0.8, transition: 'opacity 0.2s' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '1'}
          onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}>
          ↗ View
        </a>
      </div>
      {isImg && (
        <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-start' }}>
          <img src={src} alt={displayName}
            style={{ maxWidth: '100%', maxHeight: 350, objectFit: 'contain', borderRadius: 8, display: 'block', border: `1px solid ${C.border}44` }}
            onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
    </div>
  );
}

function Dropdown({ label, icon, color, options, onSelect, disabled }: {
  label: string; icon: React.ReactNode; color: string;
  options: { id: string; name: string }[];
  onSelect: (id: string, name: string) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const card = ref.current.closest('.card-wrapper') as HTMLDivElement;
      if (card) card.style.zIndex = '5000';

      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceAbove < 280 && spaceBelow > spaceAbove) setDirection('down');
      else setDirection('up');

      return () => { if (card) card.style.zIndex = '0'; };
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 5000 : 1 }}>
      <button onClick={() => !disabled && setOpen(o => !o)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? 'not-allowed' : 'pointer', background: `${color}18`, color, border: `1px solid ${color}44`, opacity: disabled ? 0.5 : 1, fontFamily: 'inherit', transition: 'all 0.2s' }}>
        {icon}
        <span>{label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 2, transform: (direction === 'up' ? !open : open) ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="m6 9 6 6 6-6"></path></svg>
      </button>
      {open && (
        <div style={{ position: 'absolute', [direction === 'up' ? 'bottom' : 'top']: 'calc(100% + 8px)', left: 0, zIndex: 5100, background: C.card, backdropFilter: 'blur(16px)', border: `1px solid ${C.border}`, borderRadius: 12, minWidth: 220, boxShadow: direction === 'up' ? '0 -8px 48px rgba(0,0,0,0.25)' : '0 8px 48px rgba(0,0,0,0.25)', padding: 6 }}>
          {options.length === 0
            ? <div style={{ padding: '10px 14px', fontSize: 12, color: C.dim }}>No options available</div>
            : options.map(opt => (
              <button key={opt.id} onClick={() => { onSelect(opt.id, opt.name); setOpen(false); }}
                style={{ width: '100%', padding: '9px 14px', background: 'transparent', border: 'none', color: C.text, fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left', borderRadius: 7, display: 'block' }}
                onMouseEnter={e => (e.currentTarget.style.background = `${color}18`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                {opt.name}
              </button>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ─── AI Governance Section ─────────────────────────────────────────────────────
function GovernanceSection() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true);
  const [localDrafts, setLocalDrafts] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [waGroups, setWaGroups] = useState<WAGroup[]>([]);
  const [sending, setSending] = useState<Set<number>>(new Set());
  const activeFilter: 'all' | 'slack' | 'whatsapp' | 'high' = 'all';
  const approvingRef = useRef<Set<string>>(new Set());

  const fetchDrafts = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/messages/drafts`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setDrafts(Array.isArray(data) ? data : (data.drafts || []));
    } catch (err) { console.error('[Governance drafts]', err); }
    finally { setLoading(false); }
  }, []);

  const fetchWAGroups = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/messages/whatsapp-groups`, { headers: authHeaders() });
      if (r.ok) { const data = await r.json(); setWaGroups(Array.isArray(data) ? data : []); }
    } catch { }
  }, []);

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
    setSending(p => new Set([...p, draft.id]));
    try {
      const r = await fetch(`${API}/api/messages/approve/${draft.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform,
          editedContent: text,
          source_type: draft.source_type,
          slackChannel: platform === 'slack' ? target : undefined,
          whatsappGroup: platform === 'whatsapp' ? target : undefined,
        }),
      });
      if (r.ok) fetchDrafts();
    } catch (err) { console.error('[Approve]', err); }
    finally {
      setSending(p => { const n = new Set(p); n.delete(draft.id); return n; });
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
      });
      setDrafts(prev => prev.map(d => d.id === id ? { ...d, approved_draft: content } : d));
      // Optional: Clear local state so Save button hides
      setLocalDrafts(p => { const n = { ...p }; delete n[id]; return n; });
    } catch (err) { console.error('[Save Draft]', err); }
    finally { setSavingId(null); }
  }

  async function handleIgnore(id: number) {
    await fetch(`${API}/api/messages/ignore/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
    setDrafts(prev => prev.filter(d => d.id !== id));
  }

  const pendingRaw = drafts.filter(d => !d.approval_status || d.approval_status === 'waiting');
  const approvedCount = drafts.filter(d => d.approval_status === 'approved').length;

  const pending = pendingRaw.filter(d => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'slack') return d.source_type === 'slack';
    if (activeFilter === 'whatsapp') return d.source_type === 'whatsapp';
    if (activeFilter === 'high') return d.priority === 'high';
    return true;
  });

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <SectionHeader title="Talos" sub="Automated Intelligence Auditor" onRefresh={fetchDrafts} loading={loading} />

      {/* Live Command Center Row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, background: `${C.sidebar}44`, border: `1px solid ${C.border}66`, padding: '12px 18px', borderRadius: 12, marginBottom: 20, flexWrap: 'wrap' }}>

        {/* Left: Engine Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, boxShadow: `0 0 10px ${C.accent}`, animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: 11, fontWeight: 800, color: C.text, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Talos Live</span>
          </div>
          <div style={{ width: 1, height: 16, background: C.border }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {[
              { icon: ICONS.slack(14, C.slack), label: 'Slack' },
              { icon: ICONS.whatsapp(14, C.wa), label: 'WA' },
              { icon: ICONS.teams(14, C.teams), label: 'Teams' }
            ].map(p => (
              <div key={p.label} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: 0.8 }} title={`${p.label} Connected`}>
                {p.icon}
                <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#10b981' }} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Growth Stats */}
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
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading...</div>
      ) : pending.length === 0 ? (
        <EmptyState message="No pending AI drafts" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {pending.map(draft => {
            const isSending = sending.has(draft.id);
            const files = parseFiles(draft.files);
            return (
              <div key={draft.id} className="card-wrapper" style={{ background: C.card, border: `4px solid ${C.border}`, borderRadius: 14, padding: 20, position: 'relative', zIndex: 0 }}>
                <button onClick={() => handleIgnore(draft.id)}
                  style={{ position: 'absolute', top: 14, right: 14, background: '#ef444420', border: '1px solid #ef444440', color: '#ef4444', borderRadius: 6, width: 26, height: 26, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
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
                    {draft.priority && (
                      <span style={{ fontSize: 10, fontWeight: 700, background: draft.priority === 'high' ? '#ef444422' : `${C.accent}22`, color: draft.priority === 'high' ? '#ef4444' : C.accent, border: `1px solid ${draft.priority === 'high' ? '#ef444444' : `${C.accent}44`}`, padding: '1px 7px', borderRadius: 4, textTransform: 'uppercase' }}>{draft.priority}</span>
                    )}
                  </div>
                </div>
                {draft.original_body && draft.original_body !== draft.content && (
                  <div style={{ fontSize: 13, color: C.dim, lineHeight: 1.6, marginBottom: 12, fontStyle: 'italic', whiteSpace: 'pre-wrap', paddingRight: 6 }}>"{clean(draft.original_body)}"</div>
                )}
                {files.map((f, i) => <FileAttachment key={i} file={f} />)}
                {draft.ai_reasoning && (
                  <div style={{ background: `${C.border}33`, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: C.dim, lineHeight: 1.5, display: 'flex', alignItems: 'flex-start', gap: 10, whiteSpace: 'pre-wrap' }}>
                    <span style={{ marginTop: 2, flexShrink: 0 }}>{ICONS.sparkle(14, C.accent)}</span>
                    <span style={{ flex: 1 }}>{clean(draft.ai_reasoning)}</span>
                  </div>
                )}
                <textarea
                  value={localDrafts[draft.id] ?? (draft.approved_draft || clean(draft.content))}
                  onChange={e => setLocalDrafts(p => ({ ...p, [draft.id]: e.target.value }))}
                  onInput={e => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = el.scrollHeight + 'px';
                  }}
                  ref={el => {
                    if (el && !el.style.height) {
                      el.style.height = 'auto';
                      el.style.height = el.scrollHeight + 'px';
                    }
                  }}
                  style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', color: C.text, fontSize: 13, resize: 'none', marginBottom: 16, minHeight: 44, maxHeight: 400, overflow: 'hidden', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box', outline: 'none', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)' }} />

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  <Dropdown label="Forward to Slack" icon={ICONS.slack(14, C.slack)} color={C.slack} options={SLACK_CHANNELS} onSelect={(id) => handleApprove(draft, 'slack', id)} disabled={isSending} />
                  <Dropdown label="Forward to WhatsApp" icon={ICONS.whatsapp(14, C.wa)} color={C.wa} options={waGroups.map(g => ({ id: g.name, name: g.name }))} onSelect={(_, name) => handleApprove(draft, 'whatsapp', name)} disabled={isSending} />

                  {((localDrafts[draft.id] !== undefined) && (localDrafts[draft.id] !== (draft.approved_draft || draft.content))) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => handleSaveDraft(draft.id)} disabled={savingId === draft.id}
                        style={{ background: `${C.accent}22`, color: C.accent, border: `1px solid ${C.accent}44`, padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        {savingId === draft.id ? 'Saving...' : 'Save Draft'}
                      </button>
                      <button onClick={() => setLocalDrafts(p => { const n = { ...p }; delete n[draft.id]; return n; })}
                        style={{ background: 'transparent', color: C.dim, border: `1px solid ${C.border}`, padding: '8px 16px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
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

// ─── Teams Section ─────────────────────────────────────────────────────────────
function TeamsSection() {
  const [messages, setMessages] = useState<TeamsMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/teams/messages/chats`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) { console.error('[Teams]', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchMessages();
    const t = setInterval(fetchMessages, 20000);
    return () => clearInterval(t);
  }, [fetchMessages]);

  async function handleDismiss(id: number) {
    setDismissed(p => new Set([...p, id]));
    await fetch(`${API}/api/teams/messages/${id}/dismiss`, { method: 'PATCH' }).catch(() => { });
  }

  const visible = messages.filter(m => !dismissed.has(m.id) && !m.dismissed);

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <SectionHeader title="Teams Messages" sub="Incoming messages from monitored group chats" onRefresh={fetchMessages} loading={loading} />
      {loading ? <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading...</div>
        : visible.length === 0 ? <EmptyState message="No Teams messages" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const items: any[] = [];
                let lastHour = '';
                visible.forEach(msg => {
                  const hour = getHourLabel(msg.timestamp);
                  if (hour !== lastHour) {
                    items.push(<HourSeparator key={`sep-${msg.id}`} label={hour} />);
                    lastHour = hour;
                  }
                  const files = parseFiles(msg.files);
                  const links = parseLinks(msg.links);
                  items.push(
                    <div key={msg.id} className="card-wrapper" style={{ background: C.card, borderLeft: `4px solid ${C.teams}`, borderRight: `1px solid ${C.border}`, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, borderRadius: 16, padding: 20, position: 'relative', transition: 'all 0.2s', boxShadow: '0 8px 24px rgba(0,0,0,0.2)', zIndex: 0 }}>
                      <button onClick={() => handleDismiss(msg.id)}
                        style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, opacity: 0.5, transition: 'opacity 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                        onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}>✕</button>
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
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap', marginBottom: (files.length || links.length) ? 14 : 0 }}>
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
                      {files.map((f, i) => <FileAttachment key={i} file={f} />)}
                      {links.length > 0 && (
                        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {links.map((l, i) => (
                            <a key={i} href={l} target="_blank" rel="noopener noreferrer"
                              style={{ fontSize: 12, color: C.accent, textDecoration: 'none', opacity: 0.9, fontWeight: 500 }}>{ICONS.link(12, C.accent)} {l}</a>
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

// ─── Slack Section ─────────────────────────────────────────────────────────────
function SlackSection() {
  const [messages, setMessages] = useState<SlackMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [teamsChats, setTeamsChats] = useState<TeamsChat[]>([]);
  const [forwarding, setForwarding] = useState<Set<number>>(new Set());
  const [forwarded, setForwarded] = useState<Set<number>>(new Set());
  const [editMap, setEditMap] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/slack/messages`, { headers: authHeaders() });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) { console.error('[Slack]', err); }
    finally { setLoading(false); }
  }, []);

  const fetchTeamsChats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/slack/teams-chats`, { headers: authHeaders() });
      if (r.ok) { const data = await r.json(); setTeamsChats(Array.isArray(data) ? data : []); }
    } catch { }
  }, []);

  useEffect(() => {
    fetchMessages(); fetchTeamsChats();
    const t = setInterval(fetchMessages, 20000);
    return () => clearInterval(t);
  }, [fetchMessages, fetchTeamsChats]);

  async function handleDismiss(id: number) {
    setDismissed(p => new Set([...p, id]));
    await fetch(`${API}/api/dismiss/slack/${id}`, { method: 'POST' }).catch(() => { });
  }

  async function handleForward(msg: SlackMessage, chatId: string) {
    setForwarding(p => new Set([...p, msg.id]));
    const body = editingId === msg.id ? (editMap[msg.id] || msg.body) : msg.body;
    try {
      if (body) {
        await fetch(`${API}/api/slack/forward`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msgId: msg.id, chatId, editedBody: body }) });
      }
      const files = parseFiles(msg.files);
      for (const f of files) {
        const url = f.publicUrl || f.url;
        if (url) await fetch(`${API}/api/slack/forward-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msg.id, chatId, publicUrl: url, caption: f.name }) });
      }
      setForwarded(p => new Set([...p, msg.id]));
      setTimeout(() => setDismissed(p => new Set([...p, msg.id])), 1500);
      setEditingId(null);
    } catch (err) { console.error('[Slack forward]', err); }
    finally { setForwarding(p => { const n = new Set(p); n.delete(msg.id); return n; }); }
  }

  const visible = messages.filter(m => !dismissed.has(m.id) && !m.dismissed);

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <SectionHeader title="Slack Messages" sub="Forward Slack messages to Microsoft Teams" onRefresh={fetchMessages} loading={loading} />
      {loading ? <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading...</div>
        : visible.length === 0 ? <EmptyState message="No Slack messages" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const items: any[] = [];
                let lastHour = '';
                visible.forEach(msg => {
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
                      <button onClick={() => handleDismiss(msg.id)}
                        style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, opacity: 0.5 }}>✕</button>
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
                        <textarea value={editMap[msg.id] ?? msg.body} onChange={e => setEditMap(p => ({ ...p, [msg.id]: e.target.value }))}
                          style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', color: C.text, fontSize: 13, resize: 'vertical', marginBottom: 12, minHeight: 80, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
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
                      {files.map((f, i) => <FileAttachment key={i} file={f} />)}
                      <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                        {isForwarded ? <span style={{ fontSize: 12, color: C.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>✓ Forwarded</span> : (
                          <>
                            <Dropdown label={isForwarding ? 'Forwarding...' : 'Forward to Teams'} icon={ICONS.teams(14, '#fff')} color={C.teams} options={teamsChats.map(c => ({ id: c.id, name: c.name }))} onSelect={(id) => handleForward(msg, id)} disabled={isForwarding} />
                            <button onClick={() => isEditing ? setEditingId(null) : (setEditingId(msg.id), setEditMap(p => ({ ...p, [msg.id]: p[msg.id] ?? msg.body })))}
                              style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, padding: '6px 0', borderBottom: '1.5px dashed #f59e0b', opacity: 0.8, transition: 'opacity 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}>
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

// ─── WhatsApp Section ──────────────────────────────────────────────────────────
function WhatsAppSection() {
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [teamsChats, setTeamsChats] = useState<TeamsChat[]>([]);
  const [forwarding, setForwarding] = useState<Set<number>>(new Set());
  const [forwarded, setForwarded] = useState<Set<number>>(new Set());
  const [editMap, setEditMap] = useState<Record<number, string>>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  const fetchMessages = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/whatsapp/messages`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) { console.error('[WhatsApp]', err); }
    finally { setLoading(false); }
  }, []);

  const fetchTeamsChats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/slack/teams-chats`, { headers: authHeaders() });
      if (r.ok) { const data = await r.json(); setTeamsChats(Array.isArray(data) ? data : []); }
    } catch { }
  }, []);

  useEffect(() => {
    fetchMessages(); fetchTeamsChats();
    const t = setInterval(fetchMessages, 600000);
    return () => clearInterval(t);
  }, [fetchMessages, fetchTeamsChats]);

  async function handleDismiss(id: number) {
    setDismissed(p => new Set([...p, id]));
    await fetch(`${API}/api/dismiss/whatsapp/${id}`, { method: 'POST' }).catch(() => { });
  }

  async function handleForward(msg: WhatsAppMessage, chatId: string) {
    setForwarding(p => new Set([...p, msg.id]));
    const body = editingId === msg.id ? (editMap[msg.id] || msg.body) : msg.body;
    try {
      if (body) await fetch(`${API}/api/whatsapp/forward`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ msgId: msg.id, chatId, editedBody: body }) });
      const mediaUrls = parseLinks(msg.media_urls);
      for (const url of mediaUrls) {
        await fetch(`${API}/api/whatsapp/forward-image`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messageId: msg.id, chatId, mediaUrl: url }) });
      }
      setForwarded(p => new Set([...p, msg.id]));
      setTimeout(() => setDismissed(p => new Set([...p, msg.id])), 1500);
      setEditingId(null);
    } catch (err) { console.error('[WA forward]', err); }
    finally { setForwarding(p => { const n = new Set(p); n.delete(msg.id); return n; }); }
  }

  const visible = messages.filter(m => !dismissed.has(m.id) && !m.dismissed);

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <SectionHeader title="WhatsApp Messages" sub="Forward WhatsApp messages to Microsoft Teams" onRefresh={fetchMessages} loading={loading} />
      {loading ? <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading...</div>
        : visible.length === 0 ? <EmptyState message="No WhatsApp messages" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const items: any[] = [];
                let lastHour = '';
                visible.forEach(msg => {
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
                      <button onClick={() => handleDismiss(msg.id)}
                        style={{ position: 'absolute', top: 14, right: 14, background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 18, opacity: 0.5 }}>✕</button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 14, paddingRight: 40 }}>
                        <Avatar name={msg.sender} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{msg.sender || 'Unknown'}</div>
                          <div style={{ fontSize: 11, color: C.wa, marginTop: 3, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                            {ICONS.whatsapp(12, C.wa)} {msg.sender}{msg.group_name ? ` · ${msg.group_name}` : ''}
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: C.dim, fontWeight: 600 }}>{new Date(msg.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}</div>
                      </div>
                      {isEditing ? (
                        <textarea value={editMap[msg.id] ?? msg.body} onChange={e => setEditMap(p => ({ ...p, [msg.id]: e.target.value }))}
                          style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', color: C.text, fontSize: 13, resize: 'vertical', marginBottom: 12, minHeight: 80, fontFamily: 'inherit', boxSizing: 'border-box', outline: 'none' }} />
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
                      {mediaUrls.map((url, i) => (
                        isImageFile('', url)
                          ? <img key={i} src={url} alt="media" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 10, display: 'block', marginBottom: 10, border: `1px solid ${C.border}44` }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          : <a key={i} href={url} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, fontSize: 12, display: 'block', marginBottom: 8, fontWeight: 600 }}>{ICONS.link(12, C.accent)} View Attachment</a>
                      ))}
                      <div style={{ display: 'flex', gap: 14, marginTop: 14, flexWrap: 'wrap', alignItems: 'center' }}>
                        {isForwarded ? <span style={{ fontSize: 12, color: C.accent, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>✓ Forwarded</span> : (
                          <>
                            <Dropdown label={isForwarding ? 'Forwarding...' : 'Forward to Teams'} icon={ICONS.teams(14, '#fff')} color={C.teams} options={teamsChats.map(c => ({ id: c.id, name: c.name }))} onSelect={(id) => handleForward(msg, id)} disabled={isForwarding} />
                            <button onClick={() => isEditing ? setEditingId(null) : (setEditingId(msg.id), setEditMap(p => ({ ...p, [msg.id]: p[msg.id] ?? msg.body })))}
                              style={{ background: 'transparent', border: 'none', color: '#f59e0b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, padding: '6px 0', borderBottom: '1.5px dashed #f59e0b', opacity: 0.8, transition: 'opacity 0.2s' }}
                              onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                              onMouseLeave={e => e.currentTarget.style.opacity = '0.8'}>
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

// ─── Summaries Section ─────────────────────────────────────────────────────────
function SummariesSection() {
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

  const fetchFromPython = useCallback(async (path: string, init?: RequestInit) => {
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
  }, [getPythonApiCandidates]);

  const fetchSummaries = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetchFromPython('/summaries');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const sorted = (data.summaries || []).sort(
        (a: ChannelSummary, b: ChannelSummary) =>
          new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
      );
      setSummaries(sorted);
    } catch (err) {
      console.error('[Summaries]', err);
    } finally {
      setLoading(false);
    }
  }, [fetchFromPython]);

  useEffect(() => { fetchSummaries(); }, [fetchSummaries]);

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
      setSummaries(prev => prev.filter(s => !(s.source === source && s.channel_id === channelId)));
    } catch (err) {
      console.error('[Dismiss]', err);
    } finally {
      setDismissing(null);
    }
  };

  const sourceColor = (s: string) =>
    s === 'slack' ? C.slack : s === 'whatsapp' ? C.wa : s === 'teams' ? C.teams : C.accent;

  function parseExtraction(text: string) {
    if (!text || text.trim() === 'NO_ACTION' || text.startsWith('Extraction unavailable'))
      return { task: null, files: null, links: null, isEmpty: true };

    const taskBlockMatch = text.match(/^TASKS?:\s*([\s\S]*?)(?:\n(?:FILES:|LINKS:)|$)/mi);
    const rawTask =
      taskBlockMatch?.[1]?.trim() ||
      text.match(/^TASK:\s*(.+)$/m)?.[1]?.trim() ||
      null;
    const rawFiles = text.match(/^FILES:\s*(.+)$/m)?.[1]?.trim() || null;
    const rawLinks = text.match(/^LINKS:\s*(.+)$/m)?.[1]?.trim() || null;

    const task = rawTask === 'NO_ACTION' ? null : rawTask;
    const links = rawLinks === 'NO_ACTION' ? null :
      (rawLinks?.split(',').map(l => l.trim()).filter(l => /^https?:\/\//.test(l)).join(', '));
    const files = rawFiles === 'NO_ACTION' ? null :
      (rawFiles?.split(',').map(f => f.trim()).filter(Boolean).join(', ') || null);

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
        {[
          { label: 'Total Channels', val: summaries.length, color: C.text },
          { label: 'Teams', val: summaries.filter(s => s.source === 'teams').length, color: C.teams },
          { label: 'Slack + WhatsApp', val: summaries.filter(s => s.source !== 'teams').length, color: C.accent },
        ].map(stat => (
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
          <div style={{ fontSize: 12, marginTop: 8, marginBottom: 16 }}>Click "Re-summarize All" to generate</div>
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
              const linkList = links ? links.split(',').map(l => l.trim()).filter(Boolean) : [];
              const taskList = task
                ? task
                    .replace(/\r/g, '')
                    .split(/\n[•\-]\s*|;\s*|\n+/)
                    .map(t => t.replace(/^TASKS?:\s*/i, '').trim())
                    .filter(Boolean)
                : [];
              const fileList = files ? files.split(',').map(f => f.trim()).filter(Boolean) : [];
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
                      <button onClick={() => dismissSummary(s.source, s.channel_id)} disabled={isDismissing} style={{ width: 26, height: 26, borderRadius: '50%', background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, fontSize: 13, cursor: isDismissing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#ef444422'; e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#ef4444'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.dim; }}>✕</button>
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
                          <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6 }}>
                            {taskList.length > 1 ? taskList.map((t, idx) => (
                              <div key={idx} style={{ marginBottom: idx === taskList.length - 1 ? 0 : 6 }}>• {t}</div>
                            )) : task}
                          </div>
                        </div>
                      )}
                      {images.length > 0 && (
                        <div style={{ background: `${C.sidebar}66`, border: `1px solid ${C.border}44`, borderRadius: 12, padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {ICONS.link(14, C.dim)} Attached Media
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                            {images.map((url, j) => (
                              <a key={j} href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', borderRadius: 10, overflow: 'hidden', border: `1px solid ${C.border}66`, flexShrink: 0, transition: 'transform 0.2s' }}
                                onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                                onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                                <img src={url} alt={`attachment-${j + 1}`} style={{ width: 100, height: 80, objectFit: 'cover', display: 'block' }} onError={e => { const p = (e.target as HTMLImageElement).parentElement; if (p) p.style.display = 'none'; }} />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {fileList.length > 0 && (
                        <div style={{ background: `${C.sidebar}66`, border: `1px solid ${C.border}44`, borderRadius: 12, padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {ICONS.link(14, C.dim)} Mentioned Files
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {fileList.map((f, j) => (
                              <div key={j} style={{ fontSize: 12, color: C.text, fontWeight: 600 }}>• {f}</div>
                            ))}
                          </div>
                        </div>
                      )}
                      {linkList.length > 0 && (
                        <div style={{ background: `${C.sidebar}66`, border: `1px solid ${C.border}44`, borderRadius: 12, padding: '12px 16px' }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
                            {ICONS.link(14, C.dim)} Referenced Links
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {linkList.map((l, j) => (
                              <a key={j} href={l} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: C.accent, textDecoration: 'none', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ICONS.link(10, C.accent)} {l}</a>
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

// ─── Task Planner Section ─────────────────────────────────────────────────────
function TaskSection() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/tasks`);
      const data = await r.json();
      setTasks(Array.isArray(data) ? data : []);
    } catch (err) { console.error('[Tasks]', err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  async function updateStatus(id: number, status: string) {
    try {
      await fetch(`${API}/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });
      setTasks(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    } catch (err) { console.error('[Task Status]', err); }
  }

  const pending = tasks.filter(t => t.status !== 'done');

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <SectionHeader title="Task Planner" sub="Actionable requests assigned to Microsoft Teams" onRefresh={fetchTasks} loading={loading} />
      {loading ? <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading tasks...</div>
        : pending.length === 0 ? <EmptyState message="No pending tasks" />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(() => {
                const items: any[] = [];
                let lastHour = '';
                pending.forEach(task => {
                  const hour = getHourLabel(task.created_at);
                  if (hour !== lastHour) {
                    items.push(<HourSeparator key={`sep-task-${task.id}`} label={hour} />);
                    lastHour = hour;
                  }
                  items.push(
                    <div key={task.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 24px', display: 'flex', gap: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {ICONS.taskPlanner(24, C.accent)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{task.client_name || 'System Task'}</span>
                          <span style={{ fontSize: 11, color: C.dim, fontWeight: 500 }}>{new Date(task.created_at).toLocaleDateString()}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          {(() => {
                            const isWA = task.source === 'whatsapp';
                            const brandColor = isWA ? C.wa : C.slack;
                            const brandBg = isWA ? `${C.wa}15` : `${C.slack}15`;
                            const brandBorder = isWA ? `${C.wa}33` : `${C.slack}33`;
                            return (
                              <span style={{ fontSize: 10, fontWeight: 800, color: brandColor, background: brandBg, padding: '3px 10px', borderRadius: 6, border: `1px solid ${brandBorder}`, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6 }}>
                                {isWA ? ICONS.whatsapp(12, brandColor) : ICONS.slack(12, brandColor)}
                                {task.source === 'slack' ? resolveSlack(task.platform_label, task.platform_label) : task.platform_label}
                              </span>
                            );
                          })()}
                          {ICONS.arrowRight(12, C.dim)}
                          <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                            {ICONS.sparkle(12, C.accent)} Priority Insight
                          </span>
                        </div>
                        <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, background: `${C.sidebar}66`, padding: 14, borderRadius: 10, border: `1px solid ${C.border}44` }}>{task.body}</div>

                        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                          <button onClick={() => updateStatus(task.id, 'done')}
                            style={{ background: `${C.accent}22`, border: `1px solid ${C.accent}44`, color: C.accent, padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = `${C.accent}33`}
                            onMouseLeave={e => e.currentTarget.style.background = `${C.accent}22`}>
                            Verify & Close
                          </button>
                          <button onClick={() => updateStatus(task.id, 'dismissed')}
                            style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            Archive
                          </button>
                        </div>
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
function ForwardLogSection() {
  const [logs, setLogs] = useState<ForwardLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'delivered' | 'failed' | 'skipped'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'whatsapp' | 'slack' | 'teams'>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (filter !== 'all') params.append('status', filter);
      if (sourceFilter !== 'all') params.append('source', sourceFilter);
      let r: Response;
      try {
        r = await fetch(`${API}/api/forward-logs?${params}`);
      } catch {
        // Local fallback only; deployed frontend must use NEXT_PUBLIC_API_URL.
        if (
          typeof window !== 'undefined' &&
          (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ) {
          r = await fetch(`http://${window.location.hostname}:5000/api/forward-logs?${params}`);
        } else {
          throw new Error('API base URL is unreachable. Set NEXT_PUBLIC_API_URL.');
        }
      }
      const data = await r.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[ForwardLog]', err);
    } finally {
      setLoading(false);
    }
  }, [filter, sourceFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => {
    const t = setInterval(fetchLogs, 30000);
    return () => clearInterval(t);
  }, [fetchLogs]);

  const delivered = logs.filter(l => l.status === 'delivered').length;
  const failed = logs.filter(l => l.status === 'failed').length;
  const skipped = logs.filter(l => l.status === 'skipped' || l.status === 'no_mapping').length;

  function statusColor(s: string) {
    if (s === 'delivered') return '#22c55e';
    if (s === 'failed') return '#ef4444';
    return C.dim;
  }

  // Group logs by date
  function getDateLabel(iso: string) {
    if (!iso) return 'Unknown';
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  // Build grouped list
  const groupedLogs: { dateLabel: string; logs: ForwardLog[] }[] = [];
  let currentLabel = '';
  logs.forEach(log => {
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
        <button onClick={fetchLogs} disabled={loading}
          style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}33`, color: loading ? C.muted : C.accent, padding: '8px 16px', borderRadius: 8, fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          {loading ? '...' : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total', val: logs.length, color: C.text },
          { label: 'Delivered', val: delivered, color: '#22c55e' },
          { label: 'Failed', val: failed, color: '#ef4444' },
          { label: 'Skipped', val: skipped, color: C.dim },
        ].map(stat => (
          <div key={stat.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 24, fontWeight: 800, color: stat.color }}>{stat.val}</div>
            <div style={{ fontSize: 11, color: C.dim, marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'delivered', 'failed', 'skipped'] as const).map(s => (
          <button key={s} onClick={() => setFilter(s)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', background: filter === s ? `${C.accent}33` : C.card, border: `1px solid ${filter === s ? C.accent : C.border}`, color: filter === s ? C.accent : C.muted }}>{s}</button>
        ))}
        <div style={{ width: 1, background: C.border, margin: '0 4px' }} />
        {(['all', 'whatsapp', 'slack', 'teams'] as const).map(s => (
          <button key={s} onClick={() => setSourceFilter(s)} style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer', textTransform: 'capitalize', background: sourceFilter === s ? `${C.wa}22` : C.card, border: `1px solid ${sourceFilter === s ? C.wa : C.border}`, color: sourceFilter === s ? C.wa : C.muted }}>{s}</button>
        ))}
      </div>

      {/* Logs grouped by date */}
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading logs...</div>
      ) : logs.length === 0 ? (
        <EmptyState message="No flow logs recorded matching current filters." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {groupedLogs.map((group, gi) => (
            <div key={gi}>
              {/* Date separator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '20px 0 12px' }}>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <div style={{ fontSize: 11, color: C.dim, fontWeight: 800, padding: '4px 14px', background: C.sidebar, borderRadius: 20, border: `1px solid ${C.border}`, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {group.dateLabel}
                </div>
                <div style={{ flex: 1, height: 1, background: C.border }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {group.logs.map(log => {
                  const sc = statusColor(log.status);
                  const isS = log.source === 'slack';
                  const isD = log.destination === 'slack';
                  return (
                    <div key={log.id} style={{ background: C.card, border: `1px solid ${log.status === 'failed' ? '#ef444433' : (log.status === 'skipped' ? `${C.muted}33` : C.border)}`, borderLeft: `4px solid ${sc}`, borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14, boxShadow: '0 4px 16px rgba(0,0,0,0.1)' }}>
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
                          {log.is_batched && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: `${C.accent}15`, color: C.accent, border: `1px solid ${C.accent}33`, padding: '1px 7px', borderRadius: 4 }}>📦 BATCHED</span>
                          )}
                          {log.ai_category && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#2563eb22', color: '#60a5fa', border: '1px solid #2563eb44', padding: '1px 7px', borderRadius: 4, textTransform: 'uppercase' }}>🤖 {log.ai_category.replace('_', ' ')}</span>
                          )}
                          {log.task_id && (
                            <span style={{ fontSize: 10, fontWeight: 700, background: '#818cf822', color: '#818cf8', border: '1px solid #818cf844', padding: '1px 7px', borderRadius: 4 }}>📌 Task #{log.task_id}</span>
                          )}
                        </div>
                        {log.message_preview && (
                          <div style={{ fontSize: 12, color: C.text, marginBottom: 6, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            "{clean(log.message_preview)}"
                          </div>
                        )}
                        {log.ai_reason && (
                          <div style={{ fontSize: 11, color: C.muted, background: `${C.sidebar}88`, padding: '6px 10px', borderRadius: 6, fontStyle: 'italic', marginBottom: 6 }}>
                            ✦ {log.ai_reason}
                          </div>
                        )}
                        {/* Media Preview in Log */}
                        {log.media_urls && parseLinks(log.media_urls).length > 0 && (
                          <div style={{ display: 'flex', gap: 6, marginTop: 8, overflowX: 'auto', paddingBottom: 4 }}>
                            {parseLinks(log.media_urls).map((url, i) => (
                              <img key={i} src={proxyUrl(url)} alt="log attachment"
                                style={{ width: 60, height: 60, borderRadius: 6, objectFit: 'cover', border: `1px solid ${C.border}` }}
                                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                              />
                            ))}
                          </div>
                        )}
                        {log.error_reason && (
                          <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>⚠️ {log.error_reason}</div>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: C.dim, flexShrink: 0, textAlign: 'right' }}>
                        {log.forwarded_at ? new Date(log.forwarded_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''}
                      </div>
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


// ─── Admin Dashboard Section ─────────────────────────────────────────────────
function AdminSection() {
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

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/messages/health`, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        }
      });
      if (r.ok) {
        const data = await r.json();
        console.log('Health data received:', data);
        setHealth(data);
      } else {
        const errText = await r.text();
        console.error('Health check failed:', r.status, errText);
        setHealth(null);
      }
    } catch (err) {
      console.error('Health check fetch error:', err);
      setHealth(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchAiConfig = async () => {
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
  };

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

  const fetchSupabaseConfig = async () => {
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
  };

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
  }, []);

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
        {/* AI Config Card */}
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
            <input
              type="password"
              value={aiApiKeyInput}
              onChange={(e) => setAiApiKeyInput(e.target.value)}
              placeholder="OpenAI API key (optional override)"
              style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }}
            />
            <input
              type="text"
              value={aiModelInput}
              onChange={(e) => setAiModelInput(e.target.value)}
              placeholder="Model (default gpt-4o)"
              style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={saveAiConfig} disabled={aiSaving}
                style={{ background: `${C.accent}22`, border: `1px solid ${C.accent}44`, color: C.accent, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: aiSaving ? 'not-allowed' : 'pointer' }}>
                {aiSaving ? 'Saving...' : 'Save AI Config'}
              </button>
              <button onClick={resetAiConfig} disabled={aiSaving}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: aiSaving ? 'not-allowed' : 'pointer' }}>
                Reset
              </button>
            </div>
            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}>
              Key source: <b style={{ color: C.text }}>{aiConfig?.keySource || 'env'}</b>
              {aiConfig?.maskedKey ? ` (${aiConfig.maskedKey})` : ''}
            </div>
            {aiMsg && <div style={{ fontSize: 11, color: aiMsg.toLowerCase().includes('failed') ? '#ef4444' : C.accent }}>{aiMsg}</div>}
          </div>
        </div>

        {/* Supabase Config Card */}
        <div className="admin-card" style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: 'clamp(14px, 2.4vw, 24px)', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.teams}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 18 }}>🗄️</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: C.text }}>Supabase Configuration</h3>
              <div style={{ fontSize: 12, color: C.dim, marginTop: 2 }}>
                Source: <span style={{ color: C.text, fontWeight: 700 }}>{supabaseConfig?.source || 'env'}</span>
                {supabaseConfig?.dbHost ? ` | ${supabaseConfig.dbHost}` : ''}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="text"
              value={supabaseUrlInput}
              onChange={(e) => {
                setSupabaseUrlInput(e.target.value);
                setSupabaseVerified(false);
              }}
              placeholder="SUPABASE_URL"
              style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }}
            />
            <input
              type="password"
              value={supabaseServiceKeyInput}
              onChange={(e) => {
                setSupabaseServiceKeyInput(e.target.value);
                setSupabaseVerified(false);
              }}
              placeholder="SUPABASE_SERVICE_KEY"
              style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }}
            />
            <input
              type="text"
              value={supabaseBucketInput}
              onChange={(e) => {
                setSupabaseBucketInput(e.target.value);
                setSupabaseVerified(false);
              }}
              placeholder="SUPABASE_BUCKET (optional override)"
              style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }}
            />
            <div style={{ fontSize: 11, color: C.dim, marginTop: -4 }}>
              Leave bucket empty to use default from <b style={{ color: C.text }}>.env</b>.
            </div>
            <input
              type="password"
              value={supabaseDbUrlInput}
              onChange={(e) => {
                setSupabaseDbUrlInput(e.target.value);
                setSupabaseVerified(false);
              }}
              placeholder="SUPABASE_DB_URL (pooler URI)"
              style={{ width: '100%', background: C.sidebar, border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', color: C.text, fontSize: 12, outline: 'none' }}
            />
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button onClick={verifySupabaseConfig} disabled={supabaseVerifying}
                style={{ background: `${C.accent}15`, border: `1px solid ${C.accent}44`, color: C.accent, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseVerifying ? 'not-allowed' : 'pointer' }}>
                {supabaseVerifying ? 'Verifying...' : 'Verify Connection'}
              </button>
              <button onClick={saveSupabaseConfig} disabled={supabaseSaving}
                style={{ background: `${C.teams}22`, border: `1px solid ${C.teams}55`, color: C.teams, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseSaving ? 'not-allowed' : 'pointer' }}>
                {supabaseSaving ? 'Saving...' : 'Save Supabase'}
              </button>
              <button onClick={resetSupabaseConfig} disabled={supabaseSaving}
                style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseSaving ? 'not-allowed' : 'pointer' }}>
                Reset
              </button>
              <button onClick={copySchema} disabled={!supabaseVerified} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: supabaseVerified ? C.text : C.dim, opacity: supabaseVerified ? 1 : 0.6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseVerified ? 'pointer' : 'not-allowed' }}>
                Copy Schema
              </button>
              <button onClick={downloadSchema} disabled={!supabaseVerified} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: supabaseVerified ? C.text : C.dim, opacity: supabaseVerified ? 1 : 0.6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseVerified ? 'pointer' : 'not-allowed' }}>
                Download Schema
              </button>
              <button onClick={copySchemaImportCommand} disabled={!supabaseVerified} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: supabaseVerified ? C.text : C.dim, opacity: supabaseVerified ? 1 : 0.6, padding: '8px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: supabaseVerified ? 'pointer' : 'not-allowed' }}>
                Copy Import Command
              </button>
            </div>
            <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5, wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
              Service key: <b style={{ color: C.text }}>{supabaseConfig?.serviceKeyMasked || 'not set'}</b><br />
              DB URL: <b style={{ color: C.text }}>{supabaseConfig?.dbUrlMasked || 'not set'}</b><br />
              Last verified: <b style={{ color: C.text }}>
                {supabaseConfig?.lastVerifiedAt ? `${new Date(supabaseConfig.lastVerifiedAt).toLocaleString()}${supabaseConfig?.lastVerifiedDbHost ? ` (${supabaseConfig.lastVerifiedDbHost})` : ''}` : 'never'}
              </b><br />
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
          {/* Teams Card */}
          <div className="admin-card" style={{ background: `${C.bg}80`, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#4B53BC15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {ICONS.teams(20, '#4B53BC')}
            </div>
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
            <div style={{ fontSize: 11, color: C.dim, background: `${C.bg}80`, padding: '8px 12px', borderRadius: 8, wordBreak: 'break-word', overflowWrap: 'anywhere', marginTop: 8 }}>
              Webhook: {health?.teams?.notificationUrl}
            </div>
          </div>
          </div>

          {/* WhatsApp Card */}
          <div className="admin-card" style={{ background: `${C.bg}80`, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: '#25D36615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {ICONS.whatsapp(20, '#25D366')}
            </div>
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

          {/* Database & Config Card */}
          <div className="admin-card" style={{ background: `${C.bg}80`, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: `${C.accent}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 20 }}>⚙️</span>
            </div>
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
            <div style={{ fontSize: 11, color: C.dim, background: `${C.bg}80`, padding: '8px 12px', borderRadius: 8, wordBreak: 'break-word', overflowWrap: 'anywhere', marginTop: 8 }}>
              NGROK: {health?.config?.ngrok}
            </div>
          </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [activeNav, setActiveNav] = useState<NavSection>('governance');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [draftCount, setDraftCount] = useState(0);
  const [teamsCount, setTeamsCount] = useState(0);
  const [slackCount, setSlackCount] = useState(0);
  const [waCount, setWaCount] = useState(0);
  const [summaryCount, setSummaryCount] = useState(0);
  const prevCountsRef = useRef({ draftCount: 0, teamsCount: 0, slackCount: 0, waCount: 0, summaryCount: 0 });
  const bootstrappedCountsRef = useRef(false);

  const playNotificationTone = useCallback((type: 'task' | 'message' | 'summary') => {
    if (typeof window === 'undefined' || !soundEnabled) return;
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = type === 'task' ? 880 : type === 'summary' ? 740 : 660;
    osc.type = 'sine';
    osc.frequency.value = base;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.24);
    setTimeout(() => ctx.close().catch(() => {}), 350);
  }, [soundEnabled]);

  useEffect(() => {
    const saved = localStorage.getItem('openclaw-theme') as 'dark' | 'light';
    if (saved) setTheme(saved);
    const savedSound = localStorage.getItem('openclaw-sound-enabled');
    if (savedSound != null) setSoundEnabled(savedSound === 'true');
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
  }, [isMobile]);

  useEffect(() => {
    const palette = THEMES[theme];
    Object.entries(palette).forEach(([key, val]) => {
      document.documentElement.style.setProperty(`--c-${key}`, val as string);
    });
    localStorage.setItem('openclaw-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('openclaw-sound-enabled', String(soundEnabled));
  }, [soundEnabled]);

  useEffect(() => {
    if (!bootstrappedCountsRef.current) {
      prevCountsRef.current = { draftCount, teamsCount, slackCount, waCount, summaryCount };
      if (draftCount + teamsCount + slackCount + waCount + summaryCount > 0) {
        bootstrappedCountsRef.current = true;
      }
      return;
    }
    const prev = prevCountsRef.current;
    if (draftCount > prev.draftCount) playNotificationTone('task');
    else if (
      teamsCount > prev.teamsCount ||
      slackCount > prev.slackCount ||
      waCount > prev.waCount
    ) playNotificationTone('message');
    else if (summaryCount > prev.summaryCount) playNotificationTone('summary');
    prevCountsRef.current = { draftCount, teamsCount, slackCount, waCount, summaryCount };
  }, [draftCount, teamsCount, slackCount, waCount, summaryCount, soundEnabled, playNotificationTone]);

  useEffect(() => {
    async function fetchCounts() {
      try {
        const [dR, tR, sR, wR, sumR] = await Promise.all([
          fetch(`${API}/api/messages/drafts`, { headers: authHeaders() }),
          fetch(`${API}/api/teams/messages/chats`),
          fetch(`${API}/api/slack/messages`, { headers: authHeaders() }),
          fetch(`${API}/api/whatsapp/messages`),
          fetch(`${PYTHON_API}/summaries`),
        ]);
        const dD = await dR.json(); const tD = await tR.json();
        const sD = await sR.json(); const wD = await wR.json();
        const sumD = await sumR.json();
        const drafts = Array.isArray(dD) ? dD : (dD.drafts || []);
        setDraftCount(drafts.filter((d: any) => !d.approval_status || d.approval_status === 'waiting').length);
        if (Array.isArray(tD)) setTeamsCount(tD.filter((m: any) => !m.dismissed).length);
        if (Array.isArray(sD)) setSlackCount(sD.filter((m: any) => !m.dismissed).length);
        if (Array.isArray(wD)) setWaCount(wD.filter((m: any) => !m.dismissed).length);
        if (sumD.summaries) setSummaryCount(sumD.summaries.length);
      } catch { }
    }
    fetchCounts();
    const t = setInterval(fetchCounts, 30000);
    return () => clearInterval(t);
  }, []);

  const navItems: { key: NavSection; icon: React.ReactNode; label: string; sub: string; badge?: number }[] = [
    { key: 'governance', icon: ICONS.governance(18, activeNav === 'governance' ? C.accent : C.muted), label: 'Talos', sub: 'Draft review & approval', badge: draftCount },
    { key: 'teams', icon: ICONS.teams(18, activeNav === 'teams' ? C.teams : C.muted), label: 'Teams Messages', sub: 'Group chat messages', badge: teamsCount },
    { key: 'slack', icon: ICONS.slack(18, activeNav === 'slack' ? C.slack : C.muted), label: 'Slack Messages', sub: 'Forward to Teams', badge: slackCount },
    { key: 'whatsapp', icon: ICONS.whatsapp(18, activeNav === 'whatsapp' ? C.wa : C.muted), label: 'WhatsApp Messages', sub: 'Forward to Teams', badge: waCount },
    { key: 'summaries', icon: ICONS.summaries(18, activeNav === 'summaries' ? C.teams : C.muted), label: 'Chat Summaries', sub: 'AI channel summaries', badge: summaryCount },
    { key: 'tasks', icon: ICONS.taskPlanner(18, activeNav === 'tasks' ? C.accent : C.muted), label: 'Task Planner', sub: 'Links & assets from clients' },
    { key: 'forward-log', icon: ICONS.log(18, activeNav === 'forward-log' ? C.accent : C.muted), label: 'Forward Log', sub: 'Delivery status & errors' },
    { key: 'admin', icon: <span style={{ fontSize: 18 }}>⚙️</span>, label: 'System Admin', sub: 'Health & monitoring' },
  ];
  const expandedSidebarWidth = 'clamp(200px, 20vw, 248px)';
  const sidebarWidth = isMobile ? 'min(84vw, 280px)' : expandedSidebarWidth;

  return (
    <div style={{ minHeight: '100vh', width: '100%', maxWidth: '100%', background: C.bg, display: 'flex', fontFamily: "'Inter', -apple-system, sans-serif", color: C.text, overflowX: 'hidden' }}>
      {isMobile && !sidebarCollapsed && (
        <div
          onClick={() => setSidebarCollapsed(true)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 39 }}
        />
      )}
      <div style={{
        width: sidebarCollapsed ? 72 : sidebarWidth,
        transition: isMobile ? 'left 0.25s ease' : 'width 0.2s ease',
        background: C.sidebar,
        borderRight: `1px solid ${C.border}`,
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        position: isMobile ? 'fixed' : 'sticky',
        left: isMobile ? (sidebarCollapsed ? 'calc(-1 * min(84vw, 280px))' : 0) : 0,
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        zIndex: isMobile ? 40 : 'auto',
        boxShadow: isMobile && !sidebarCollapsed ? '0 8px 30px rgba(0,0,0,0.35)' : 'none',
      }}>
        <div style={{ padding: sidebarCollapsed ? '16px 10px 14px' : '22px 20px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
          {ICONS.logo(28, C.accent)}
          {!sidebarCollapsed && (
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.02em' }}>OpenClaw</div>
              <div style={{ fontSize: 10, color: C.dim, marginTop: 2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Talos</div>
            </div>
          )}
        </div>
        <nav style={{ flex: 1, padding: '6px 0' }}>
          {navItems.map(item => {
            const active = activeNav === item.key;
            return (
              <button key={item.key} onClick={() => { setActiveNav(item.key); if (isMobile) setSidebarCollapsed(true); }}
                title={sidebarCollapsed ? item.label : undefined}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: sidebarCollapsed ? '13px 8px' : '13px 20px', border: 'none', cursor: 'pointer', textAlign: 'left', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', background: active ? C.card : 'transparent', borderLeft: active ? `3px solid ${C.accent}` : '3px solid transparent' }}>
                <span style={{ fontSize: 18, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
                {!sidebarCollapsed && (
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? C.text : C.muted }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginTop: 1 }}>{item.sub}</div>
                  </div>
                )}
                {!sidebarCollapsed && !!item.badge && item.badge > 0 && (
                  <span style={{ background: item.key === 'summaries' ? C.teams : '#ef4444', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10 }}>{item.badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: sidebarCollapsed ? '12px 8px 16px' : '16px 20px', borderTop: `1px solid ${C.border}` }}>
          <button
            onClick={() => setSidebarCollapsed(v => !v)}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: sidebarCollapsed ? '10px 8px' : '9px 12px', background: 'transparent', border: `1px solid ${C.border}`, borderRadius: 10, cursor: 'pointer', color: C.muted, marginBottom: 8 }}
          >
            <span style={{ fontSize: 14, fontWeight: 700 }}>{sidebarCollapsed ? '»' : '«'}</span>
            {!sidebarCollapsed && <span style={{ fontSize: 12, fontWeight: 700 }}>Collapse</span>}
          </button>
          <button onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
            title={sidebarCollapsed ? 'Toggle theme' : undefined}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: 12, padding: sidebarCollapsed ? '10px 8px' : '11px 14px', background: `${C.accent}10`, border: `1px solid ${C.accent}33`, borderRadius: 12, cursor: 'pointer', color: C.text, transition: 'all 0.2s', outline: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = `${C.accent}20`}
            onMouseLeave={e => e.currentTarget.style.background = `${C.accent}10`}>
            {theme === 'dark' ? ICONS.sun(18, C.accent) : ICONS.moon(18, C.accent)}
            {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 700 }}>{theme === 'dark' ? 'Green Light' : 'Deep Dark'}</span>}
          </button>
          <button
            onClick={() => setSoundEnabled(v => !v)}
            title={sidebarCollapsed ? 'Toggle notification sounds' : undefined}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: 12, padding: sidebarCollapsed ? '10px 8px' : '11px 14px', marginTop: 8, background: `${C.teams}10`, border: `1px solid ${C.teams}33`, borderRadius: 12, cursor: 'pointer', color: C.text, transition: 'all 0.2s', outline: 'none' }}
          >
            <span style={{ fontSize: 14 }}>{soundEnabled ? '🔔' : '🔕'}</span>
            {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 700 }}>{soundEnabled ? 'Sounds On' : 'Sounds Off'}</span>}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, height: '100vh', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, position: 'relative' }}>
        {isMobile && sidebarCollapsed && (
          <button
            onClick={() => setSidebarCollapsed(false)}
            title="Open sidebar"
            style={{
              position: 'fixed',
              top: 8,
              left: 8,
              width: 34,
              height: 34,
              borderRadius: 10,
              border: `1px solid ${C.border}`,
              background: C.card,
              color: C.text,
              cursor: 'pointer',
              zIndex: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            ☰
          </button>
        )}
        {activeNav === 'governance' && <GovernanceSection />}
        {activeNav === 'teams' && <TeamsSection />}
        {activeNav === 'slack' && <SlackSection />}
        {activeNav === 'whatsapp' && <WhatsAppSection />}
        {activeNav === 'summaries' && <SummariesSection />}
        {activeNav === 'forward-log' && <ForwardLogSection />}
        {activeNav === 'tasks' && <TaskSection />}
        {activeNav === 'admin' && <AdminSection />}
      </div>
    </div>
  );
}