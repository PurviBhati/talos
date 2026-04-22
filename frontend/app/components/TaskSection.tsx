'use client';

import { useCallback, useEffect, useState } from 'react';

interface Task {
  id: number;
  source: string;
  source_message_id: number;
  client_name: string;
  platform_label: string;
  body: string;
  status: string;
  created_at: string;
  updated_at: string;
}

type TaskSectionProps = {
  C: Record<string, string>;
  ICONS: {
    taskPlanner: (size?: number, color?: string) => React.ReactNode;
    whatsapp: (size?: number, color?: string) => React.ReactNode;
    slack: (size?: number, color?: string) => React.ReactNode;
    arrowRight: (size?: number, color?: string) => React.ReactNode;
    sparkle: (size?: number, color?: string) => React.ReactNode;
  };
  API: string;
  SectionHeader: React.ComponentType<{ title: string; sub: string; onRefresh: () => void; loading: boolean }>;
  EmptyState: React.ComponentType<{ message?: string; type?: 'info' | 'success' | 'error' }>;
  HourSeparator: React.ComponentType<{ label: string }>;
  resolveSlack: (id: string, name: string) => string;
  getHourLabel: (iso: string) => string;
  authHeaders: () => HeadersInit;
  apiFetchJson: <T>(input: string, init?: RequestInit) => Promise<T>;
};

export function TaskSection(props: TaskSectionProps) {
  const { C, ICONS, API, SectionHeader, EmptyState, HourSeparator, resolveSlack, getHourLabel, authHeaders, apiFetchJson } = props;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetchJson<Task[]>(`${API}/api/tasks`, { headers: authHeaders() });
      setTasks(Array.isArray(data) ? data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load tasks';
      console.error('[Tasks]', err);
      setError(message);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [API, apiFetchJson, authHeaders]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  async function updateStatus(id: number, status: string) {
    try {
      await apiFetchJson(`${API}/api/tasks/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ status }),
      });
      setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    } catch (err) {
      console.error('[Task Status]', err);
    }
  }

  const pending = tasks.filter((t) => t.status !== 'done');

  return (
    <div style={{ padding: 'clamp(12px, 2.8vw, 24px)' }}>
      <SectionHeader title="Task Planner" sub="Actionable requests assigned to Microsoft Teams" onRefresh={fetchTasks} loading={loading} />
      {loading ? (
        <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>Loading tasks...</div>
      ) : error ? (
        <EmptyState message={error} type="error" />
      ) : pending.length === 0 ? (
        <EmptyState message="No pending tasks" />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {(() => {
            const items: React.ReactNode[] = [];
            let lastHour = '';
            pending.forEach((task) => {
              const hour = getHourLabel(task.created_at);
              if (hour !== lastHour) {
                items.push(<HourSeparator key={`sep-task-${task.id}`} label={hour} />);
                lastHour = hour;
              }
              items.push(
                <div key={task.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: '20px 24px', display: 'flex', gap: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${C.accent}15`, border: `1px solid ${C.accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{ICONS.taskPlanner(24, C.accent)}</div>
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
                      <span style={{ fontSize: 11, color: C.accent, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>{ICONS.sparkle(12, C.accent)} Priority Insight</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, background: `${C.sidebar}66`, padding: 14, borderRadius: 10, border: `1px solid ${C.border}44` }}>{task.body}</div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                      <button onClick={() => updateStatus(task.id, 'done')} style={{ background: `${C.accent}22`, border: `1px solid ${C.accent}44`, color: C.accent, padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => (e.currentTarget.style.background = `${C.accent}33`)} onMouseLeave={(e) => (e.currentTarget.style.background = `${C.accent}22`)}>
                        Verify & Close
                      </button>
                      <button onClick={() => updateStatus(task.id, 'dismissed')} style={{ background: 'transparent', border: `1px solid ${C.border}`, color: C.dim, padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
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
