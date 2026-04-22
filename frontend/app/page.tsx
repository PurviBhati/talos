'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect, @next/next/no-img-element */

import { useEffect, useState, useCallback, useRef } from 'react';
import { useAppStore } from './store/useAppStore';
import { GovernanceSection as GovernanceSectionView } from './components/GovernanceSection';
import { TeamsSection as TeamsSectionView } from './components/TeamsSection';
import { SlackSection as SlackSectionView } from './components/SlackSection';
import { WhatsAppSection as WhatsAppSectionView } from './components/WhatsAppSection';
import { SummariesSection as SummariesSectionView } from './components/SummariesSection';
import { TaskSection as TaskSectionView } from './components/TaskSection';
import { LinkReadsSection as LinkReadsSectionView } from './components/LinkReadsSection';
import { ForwardLogSection as ForwardLogSectionView } from './components/ForwardLogSection';
import { AdminSection as AdminSectionView } from './components/AdminSection';
import ErrorBoundary from './components/ErrorBoundary';

function normalizeBaseUrl(value?: string | null) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function isLocalHostname(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

function resolveApiBaseUrl() {
  const configured = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL);
  if (configured) return configured;
  if (typeof window === 'undefined') return 'http://localhost:5000';
  if (isLocalHostname(window.location.hostname)) {
    return `http://${window.location.hostname}:5000`;
  }
  return normalizeBaseUrl(window.location.origin);
}

function resolvePythonApiBaseUrl() {
  const configured = normalizeBaseUrl(process.env.NEXT_PUBLIC_PYTHON_API_URL);
  if (configured) return configured;
  if (typeof window === 'undefined') return 'http://localhost:8000';
  if (isLocalHostname(window.location.hostname)) {
    return `http://${window.location.hostname}:8000`;
  }
  return normalizeBaseUrl(window.location.origin);
}

const API = resolveApiBaseUrl();
const PYTHON_API = resolvePythonApiBaseUrl();

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
    'text-soft': '#d3eee0',
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
    'text-soft': '#2e5e4f',
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

const authHeaders = (): HeadersInit => ({});

async function apiFetchJson<T>(input: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(input, init);
  } catch (error: any) {
    if (typeof window !== 'undefined' && !isLocalHostname(window.location.hostname) && !normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL)) {
      throw new Error('Live frontend needs NEXT_PUBLIC_API_URL set to your backend URL.');
    }
    throw new Error(error?.message || 'Failed to reach API');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.error || payload?.message || `HTTP ${response.status}`);
  }
  return (payload?.data ?? payload) as T;
}

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

type NavSection = 'governance' | 'teams' | 'slack' | 'whatsapp' | 'tasks' | 'link-reads' | 'admin' | 'settings' | 'summaries' | 'forward-log';

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

function EmptyState({ message = 'No messages', type = 'info' }: { message?: string, type?: 'info' | 'success' | 'error' }) {
  return (
    <div style={{ textAlign: 'center', color: C.dim, padding: '60px 20px', background: C.card, borderRadius: 12, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
      {type === 'success' ? ICONS.check(32, C.accent) : type === 'error' ? ICONS.error(32, '#ef4444') : ICONS.logo(32, C.dim)}
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
  return (
    <GovernanceSectionView
      C={C}
      ICONS={ICONS}
      API={API}
      SLACK_CHANNELS={SLACK_CHANNELS}
      SectionHeader={SectionHeader}
      EmptyState={EmptyState}
      Dropdown={Dropdown}
      Avatar={Avatar}
      FileAttachment={FileAttachment}
      parseFiles={parseFiles}
      clean={clean}
      formatDate={formatDate}
      authHeaders={authHeaders}
      apiFetchJson={apiFetchJson}
    />
  );
}

// ─── Teams Section ─────────────────────────────────────────────────────────────
function TeamsSection() {
  return (
    <TeamsSectionView
      C={C}
      ICONS={ICONS}
      API={API}
      SectionHeader={SectionHeader}
      EmptyState={EmptyState}
      Avatar={Avatar}
      HourSeparator={HourSeparator}
      LinkPreview={LinkPreview}
      FileAttachment={FileAttachment}
      parseFiles={parseFiles}
      parseLinks={parseLinks}
      clean={clean}
      getHourLabel={getHourLabel}
      authHeaders={authHeaders}
      apiFetchJson={apiFetchJson}
    />
  );
}

// ─── Slack Section ─────────────────────────────────────────────────────────────
function SlackSection() {
  return (
    <SlackSectionView
      C={C}
      ICONS={ICONS}
      API={API}
      SectionHeader={SectionHeader}
      EmptyState={EmptyState}
      Avatar={Avatar}
      HourSeparator={HourSeparator}
      LinkPreview={LinkPreview}
      FileAttachment={FileAttachment}
      Dropdown={Dropdown}
      parseFiles={parseFiles}
      clean={clean}
      getHourLabel={getHourLabel}
      authHeaders={authHeaders}
      apiFetchJson={apiFetchJson}
    />
  );
}

// ─── WhatsApp Section ──────────────────────────────────────────────────────────
function WhatsAppSection() {
  return (
    <WhatsAppSectionView
      C={C}
      ICONS={ICONS}
      API={API}
      SectionHeader={SectionHeader}
      EmptyState={EmptyState}
      Avatar={Avatar}
      HourSeparator={HourSeparator}
      LinkPreview={LinkPreview}
      Dropdown={Dropdown}
      parseLinks={parseLinks}
      clean={clean}
      getHourLabel={getHourLabel}
      isImageFile={isImageFile}
      authHeaders={authHeaders}
      apiFetchJson={apiFetchJson}
    />
  );
}

// ─── Summaries Section ─────────────────────────────────────────────────────────
function SummariesSection() {
  return (
    <SummariesSectionView
      C={C}
      ICONS={ICONS}
      HourSeparator={HourSeparator}
      getHourLabel={getHourLabel}
      formatDate={formatDate}
      resolveSlack={(id = '', fallback = '') => resolveSlack(id, fallback)}
    />
  );
}

// ─── Task Planner Section ─────────────────────────────────────────────────────
function TaskSection() {
  return (
    <TaskSectionView
      C={C}
      ICONS={ICONS}
      API={API}
      SectionHeader={SectionHeader}
      EmptyState={EmptyState}
      HourSeparator={HourSeparator}
      resolveSlack={resolveSlack}
      getHourLabel={getHourLabel}
      authHeaders={authHeaders}
      apiFetchJson={apiFetchJson}
    />
  );
}

function LinkReadsSection() {
  return (
    <LinkReadsSectionView
      C={C}
      API={API}
      SectionHeader={SectionHeader}
      EmptyState={EmptyState}
      authHeaders={authHeaders}
      apiFetchJson={apiFetchJson}
    />
  );
}

function ForwardLogSection() {
  return (
    <ForwardLogSectionView
      C={C}
      ICONS={ICONS}
      API={API}
      EmptyState={EmptyState}
      resolveSlack={resolveSlack}
      parseLinks={parseLinks}
      proxyUrl={proxyUrl}
      clean={clean}
      authHeaders={authHeaders}
      apiFetchJson={apiFetchJson}
    />
  );
}

function AdminSection() {
  return (
    <AdminSectionView
      C={C}
      ICONS={ICONS}
      API={API}
      authHeaders={authHeaders}
      apiFetchJson={apiFetchJson}
    />
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
    const {
      activeNav, setActiveNav,
      theme, toggleTheme,
      soundEnabled, toggleSound,
      sidebarCollapsed, setSidebarCollapsed,
      isMobile, setIsMobile,
      draftCount, setDraftCount, teamsCount, setTeamsCount, slackCount, setSlackCount, waCount, setWaCount, summaryCount, setSummaryCount,
    } = useAppStore()

    const prevCountsRef = useRef({ draftCount: 0, teamsCount: 0, slackCount: 0, waCount: 0, summaryCount: 0 })
    const bootstrappedCountsRef = useRef(false)
  
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
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setIsMobile]);

  useEffect(() => {
    if (isMobile) setSidebarCollapsed(true);
  }, [isMobile, setSidebarCollapsed]);

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
        const [drafts, teamsData, slackData, whatsappData, sumD] = await Promise.all([
          apiFetchJson<any[]>(`${API}/api/messages/drafts`, { headers: authHeaders() }),
          apiFetchJson<any[]>(`${API}/api/teams/messages/chats`, { headers: authHeaders() }),
          apiFetchJson<any[]>(`${API}/api/slack/messages`, { headers: authHeaders() }),
          apiFetchJson<any[]>(`${API}/api/whatsapp/messages`, { headers: authHeaders() }),
          apiFetchJson<any>(`${PYTHON_API}/summaries`),
        ]);
        setDraftCount(drafts.filter((d: any) => !d.approval_status || d.approval_status === 'waiting').length);
        if (Array.isArray(teamsData)) setTeamsCount(teamsData.filter((m: any) => !m.dismissed).length);
        if (Array.isArray(slackData)) setSlackCount(slackData.filter((m: any) => !m.dismissed).length);
        if (Array.isArray(whatsappData)) setWaCount(whatsappData.filter((m: any) => !m.dismissed).length);
        if (sumD.summaries) setSummaryCount(sumD.summaries.length);
      } catch { }
    }
    fetchCounts();
    const t = setInterval(fetchCounts, 30000);
    return () => clearInterval(t);
  }, [setDraftCount, setTeamsCount, setSlackCount, setWaCount, setSummaryCount]);

  const navItems: { key: NavSection; icon: React.ReactNode; label: string; sub: string; badge?: number }[] = [
    { key: 'governance', icon: ICONS.governance(18, activeNav === 'governance' ? C.accent : C.muted), label: 'Talos', sub: 'Draft review & approval', badge: draftCount },
    { key: 'teams', icon: ICONS.teams(18, activeNav === 'teams' ? C.teams : C.muted), label: 'Teams Messages', sub: 'Group chat messages', badge: teamsCount },
    { key: 'slack', icon: ICONS.slack(18, activeNav === 'slack' ? C.slack : C.muted), label: 'Slack Messages', sub: 'Forward to Teams', badge: slackCount },
    { key: 'whatsapp', icon: ICONS.whatsapp(18, activeNav === 'whatsapp' ? C.wa : C.muted), label: 'WhatsApp Messages', sub: 'Forward to Teams', badge: waCount },
    { key: 'summaries', icon: ICONS.summaries(18, activeNav === 'summaries' ? C.teams : C.muted), label: 'Chat Summaries', sub: 'AI channel summaries', badge: summaryCount },
    { key: 'tasks', icon: ICONS.taskPlanner(18, activeNav === 'tasks' ? C.accent : C.muted), label: 'Task Planner', sub: 'Links & assets from clients' },
    { key: 'link-reads', icon: ICONS.link(18, activeNav === 'link-reads' ? C.accent : C.muted), label: 'Link Reads', sub: 'Jina URL extraction log' },
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
          <button onClick={toggleTheme}
            title={sidebarCollapsed ? 'Toggle theme' : undefined}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start', gap: 12, padding: sidebarCollapsed ? '10px 8px' : '11px 14px', background: `${C.accent}10`, border: `1px solid ${C.accent}33`, borderRadius: 12, cursor: 'pointer', color: C.text, transition: 'all 0.2s', outline: 'none' }}
            onMouseEnter={e => e.currentTarget.style.background = `${C.accent}20`}
            onMouseLeave={e => e.currentTarget.style.background = `${C.accent}10`}>
            {theme === 'dark' ? ICONS.sun(18, C.accent) : ICONS.moon(18, C.accent)}
            {!sidebarCollapsed && <span style={{ fontSize: 13, fontWeight: 700 }}>{theme === 'dark' ? 'Green Light' : 'Deep Dark'}</span>}
          </button>
          <button
            onClick={toggleSound}
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
        {activeNav === 'governance' && (
          <ErrorBoundary sectionName="Governance">
            <GovernanceSection />
          </ErrorBoundary>
        )}

        {activeNav === 'teams' && (
          <ErrorBoundary sectionName="Teams Messages">
            <TeamsSection />
          </ErrorBoundary>
        )}

        {activeNav === 'slack' && (
          <ErrorBoundary sectionName="Slack Messages">
            <SlackSection />
          </ErrorBoundary>
        )}

        {activeNav === 'whatsapp' && (
          <ErrorBoundary sectionName="WhatsApp Messages">
            <WhatsAppSection />
          </ErrorBoundary>
        )}

        {activeNav === 'summaries' && (
          <ErrorBoundary sectionName="Chat Summaries">
            <SummariesSection />
          </ErrorBoundary>
        )}

        {activeNav === 'tasks' && (
          <ErrorBoundary sectionName="Task Planner">
            <TaskSection />
          </ErrorBoundary>
        )}

        {activeNav === 'link-reads' && (
          <ErrorBoundary sectionName="Link Reads">
            <LinkReadsSection />
          </ErrorBoundary>
        )}

        {activeNav === 'forward-log' && (
          <ErrorBoundary sectionName="Forward Log">
            <ForwardLogSection />
          </ErrorBoundary>
        )}

        {activeNav === 'admin' && (
          <ErrorBoundary sectionName="System Admin">
            <AdminSection />
          </ErrorBoundary>
        )}
      </div>
    </div>
  );
}