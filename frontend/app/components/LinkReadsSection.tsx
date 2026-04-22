'use client';

import { useCallback, useEffect, useState } from 'react';

interface LinkRead {
  id: number;
  source: string;
  source_message_id?: number;
  platform_label?: string;
  sender?: string;
  sender_handle?: string;
  comment_body?: string;
  url: string;
  read_content?: string;
  created_at: string;
}

type LinkReadsSectionProps = {
  C: Record<string, string>;
  API: string;
  SectionHeader: React.ComponentType<{ title: string; sub: string; onRefresh: () => void; loading: boolean }>;
  EmptyState: React.ComponentType<{ message?: string; type?: 'info' | 'success' | 'error' }>;
  authHeaders: () => HeadersInit;
  apiFetchJson: <T>(input: string, init?: RequestInit) => Promise<T>;
};

export function LinkReadsSection(props: LinkReadsSectionProps) {
  const { C, API, SectionHeader, EmptyState, authHeaders, apiFetchJson } = props;
  const [items, setItems] = useState<LinkRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedReads, setExpandedReads] = useState<Record<number, boolean>>({});
  const [expandedRawReads, setExpandedRawReads] = useState<Record<number, boolean>>({});
  const [error, setError] = useState('');

  function cleanSnippet(value: string, max = 280) {
    const normalized = String(value || '').replace(/\s+/g, ' ').trim();
    if (!normalized) return '';
    return normalized.length > max ? `${normalized.slice(0, max)}...` : normalized;
  }

  function parseCommentPoints(commentBody: string) {
    const raw = String(commentBody || '').trim();
    if (!raw) return [];
    const normalized = raw.replace(/\[Quoted:\s*(https?:\/\/[^\]\s]+)\s*\]/gi, '\nQuoted link: $1');
    const lines = normalized.split(/\n+|(?=Quoted link:\s*https?:\/\/)|(?=Source link:\s*https?:\/\/)/g).map((part) => part.trim()).filter(Boolean);
    const basePoints =
      lines.length > 1
        ? lines
        : normalized
            .split(/(?<=[.!?])\s+/)
            .map((part) => part.trim())
            .filter(Boolean);

    return basePoints
      .map((point, idx) => {
        const labelMatch = point.match(/^(Quoted link|Source link):\s*(https?:\/\/\S+)/i);
        if (labelMatch) return { key: `link-${idx}`, text: labelMatch[1], href: labelMatch[2] };
        const urlMatch = point.match(/(https?:\/\/\S+)/i);
        if (urlMatch) return { key: `mixed-${idx}`, text: cleanSnippet(point.replace(urlMatch[1], '').trim(), 180) || 'Link', href: urlMatch[1] };
        return { key: `text-${idx}`, text: cleanSnippet(point, 220), href: '' };
      })
      .filter((item) => item.text || item.href);
  }

  function parseFigmaReadContent(readContent: string) {
    const raw = String(readContent || '').trim();
    if (!raw || !/figma/i.test(raw)) return null;
    const title = raw.match(/Title:\s*([\s\S]*?)(?=\s+URL Source:|$)/i)?.[1]?.trim() || '';
    const source = raw.match(/URL Source:\s*([\s\S]*?)(?=\s+Published Time:|$)/i)?.[1]?.trim() || '';
    const publishedTime = raw.match(/Published Time:\s*([\s\S]*?)(?=\s+Markdown Content:|$)/i)?.[1]?.trim() || '';
    const markdown = raw.match(/Markdown Content:\s*([\s\S]*)$/i)?.[1]?.trim() || '';
    const commentMatches = [...markdown.matchAll(/#\d+\s+([^\n#]+?)\s+(\d+\s+\w+\s+ago)\s+([\s\S]*?)(?=\s+#\d+\s+|$)/g)];
    const comments = commentMatches
      .map((match, idx) => ({
        key: `figma-comment-${idx}`,
        author: cleanSnippet(match[1], 60),
        age: cleanSnippet(match[2], 40),
        text: cleanSnippet(match[3].replace(/!\[.*?\]\(.*?\)/g, '').trim(), 220),
      }))
      .filter((item) => item.text);
    return { title: cleanSnippet(title, 120), source, publishedTime: cleanSnippet(publishedTime, 80), comments: comments.slice(0, 5), rawMarkdown: markdown };
  }

  function formatReadContentPoints(readContent: string): string[] {
    const raw = String(readContent || '').trim();
    if (!raw) return [];
    const chunks = raw
      .split(/\s*(?=Title:|URL Source:|Published Time:|Markdown Content:|Comment:)\s*/g)
      .map((s) => s.trim())
      .filter(Boolean);
    if (chunks.length > 1) return chunks.slice(0, 8).map((chunk) => (chunk.replace(/\s+/g, ' ').trim().length > 280 ? `${chunk.replace(/\s+/g, ' ').trim().slice(0, 280)}...` : chunk.replace(/\s+/g, ' ').trim()));
    return raw
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map((line) => (line.length > 280 ? `${line.slice(0, 280)}...` : line));
  }

  const fetchReads = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetchJson<LinkRead[]>(`${API}/api/link-reads?limit=120`, { headers: authHeaders() });
      setItems(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load link reads';
      console.error('[LinkReads]', err);
      setError(message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [API, apiFetchJson, authHeaders]);

  useEffect(() => {
    fetchReads();
  }, [fetchReads]);

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <SectionHeader title="Link Reads" sub="Jina URL reads with source, sender, comment, and extracted content" onRefresh={fetchReads} loading={loading} />
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading link reads...</div>
      ) : error ? (
        <EmptyState message={error} type="error" />
      ) : items.length === 0 ? (
        <EmptyState message="No link reads yet" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((row) => (
            <div key={row.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: C.accent, background: `${C.accent}18`, border: `1px solid ${C.accent}44`, borderRadius: 6, padding: '3px 8px', textTransform: 'uppercase' }}>{row.source || 'unknown'}</span>
                  <span style={{ fontSize: 12, color: C.text, fontWeight: 700 }}>{row.sender || row.sender_handle || 'Unknown sender'}</span>
                  {row.platform_label && <span style={{ fontSize: 11, color: C.dim }}>via {row.platform_label}</span>}
                </div>
                <span style={{ fontSize: 11, color: C.dim }}>{row.created_at ? new Date(row.created_at).toLocaleString('en-IN') : ''}</span>
              </div>
              <a href={row.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: 12, color: C.accent, textDecoration: 'none', marginBottom: 10, wordBreak: 'break-all' }}>
                {row.url}
              </a>
              {row.comment_body && (
                <div style={{ fontSize: 12, color: C.text, background: `${C.sidebar}66`, border: `1px solid ${C.border}44`, borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  <b>Comment:</b>
                  <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                    {parseCommentPoints(row.comment_body).map((point) => (
                      <li key={`${row.id}-${point.key}`} style={{ marginBottom: 4, wordBreak: 'break-word' }}>
                        {point.text}
                        {point.href && (
                          <>
                            {point.text ? ' ' : ''}
                            <a href={point.href} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none', fontWeight: 700 }}>
                              {point.text.toLowerCase().includes('quoted') ? 'Open quoted link' : 'Open link'}
                            </a>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5, background: `${C.sidebar}66`, border: `1px solid ${C.border}44`, borderRadius: 10, padding: 10 }}>
                <b>Read Content:</b>
                {row.read_content ? (() => {
                  const figmaData = parseFigmaReadContent(row.read_content);
                  const points = formatReadContentPoints(row.read_content);
                  const expanded = !!expandedReads[row.id];
                  const visiblePoints = expanded ? points : points.slice(0, 5);
                  const canExpand = points.length > 5;
                  const rawExpanded = !!expandedRawReads[row.id];
                  return (
                    <>
                      {figmaData ? (
                        <div style={{ marginTop: 8 }}>
                          <div style={{ display: 'grid', gap: 8 }}>
                            {figmaData.title && <div><b>Title:</b> {figmaData.title}</div>}
                            {figmaData.source && <div><b>Source:</b> <a href={figmaData.source} target="_blank" rel="noopener noreferrer" style={{ color: C.accent, textDecoration: 'none' }}>Open source link</a></div>}
                            {figmaData.publishedTime && <div><b>Published:</b> {figmaData.publishedTime}</div>}
                          </div>
                          {figmaData.comments.length > 0 && (
                            <>
                              <div style={{ marginTop: 10, fontWeight: 700 }}>Top comments</div>
                              <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                                {figmaData.comments.map((comment) => (
                                  <li key={`${row.id}-${comment.key}`} style={{ marginBottom: 6, wordBreak: 'break-word' }}>
                                    <b>{comment.author}</b>{comment.age ? ` (${comment.age})` : ''}: {comment.text}
                                  </li>
                                ))}
                              </ul>
                            </>
                          )}
                          {figmaData.rawMarkdown && (
                            <>
                              <button type="button" onClick={() => setExpandedRawReads((prev) => ({ ...prev, [row.id]: !prev[row.id] }))} style={{ marginTop: 8, border: 'none', background: 'transparent', color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                                {rawExpanded ? 'Hide raw content' : 'Show raw content'}
                              </button>
                              {rawExpanded && <div style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', color: C.dim }}>{cleanSnippet(figmaData.rawMarkdown, 1500)}</div>}
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          <ul style={{ margin: '8px 0 0', paddingLeft: 18 }}>
                            {visiblePoints.map((point, idx) => (
                              <li key={`${row.id}-rc-${idx}`} style={{ marginBottom: 4, wordBreak: 'break-word' }}>{point}</li>
                            ))}
                          </ul>
                          {canExpand && (
                            <button type="button" onClick={() => setExpandedReads((prev) => ({ ...prev, [row.id]: !prev[row.id] }))} style={{ marginTop: 8, border: 'none', background: 'transparent', color: C.accent, fontSize: 12, fontWeight: 700, cursor: 'pointer', padding: 0 }}>
                              {expanded ? 'Show less' : `Show more (${points.length - visiblePoints.length} more)`}
                            </button>
                          )}
                        </>
                      )}
                    </>
                  );
                })() : <div style={{ marginTop: 6 }}>No readable content extracted.</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
