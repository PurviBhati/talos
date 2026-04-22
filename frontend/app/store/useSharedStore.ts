import { create } from 'zustand';

type SharedSource = 'teams' | 'slack' | 'whatsapp';
type DismissedMap = Record<SharedSource, Set<number>>;

export interface TeamsChatOption {
  id: string;
  name: string;
}

type SharedStore = {
  dismissed: DismissedMap;
  dismissMessage: (source: SharedSource, id: number) => void;
  restoreMessage: (source: SharedSource, id: number) => void;
  isDismissed: (source: SharedSource, id: number) => boolean;
  clearDismissed: (source: SharedSource) => void;
  teamsChats: TeamsChatOption[];
  teamsChatsLoading: boolean;
  teamsChatsError: string;
  teamsChatsLastFetchedAt: number | null;
  fetchTeamsChats: (apiBase: string, headers?: HeadersInit, force?: boolean) => Promise<void>;
};

const CACHE_TTL_MS = 60 * 1000;
let inFlightTeamsChatsFetch: Promise<void> | null = null;

const initialDismissed: DismissedMap = {
  teams: new Set<number>(),
  slack: new Set<number>(),
  whatsapp: new Set<number>(),
};

export const useSharedStore = create<SharedStore>((set, get) => ({
  dismissed: initialDismissed,
  dismissMessage: (source, id) =>
    set((state) => ({
      dismissed: {
        ...state.dismissed,
        [source]: new Set([...state.dismissed[source], id]),
      },
    })),
  restoreMessage: (source, id) =>
    set((state) => {
      const next = new Set(state.dismissed[source]);
      next.delete(id);
      return {
        dismissed: {
          ...state.dismissed,
          [source]: next,
        },
      };
    }),
  isDismissed: (source, id) => get().dismissed[source].has(id),
  clearDismissed: (source) =>
    set((state) => ({
      dismissed: {
        ...state.dismissed,
        [source]: new Set<number>(),
      },
    })),
  teamsChats: [],
  teamsChatsLoading: false,
  teamsChatsError: '',
  teamsChatsLastFetchedAt: null,
  fetchTeamsChats: async (apiBase, headers = {}, force = false) => {
    const state = get();
    const hasFreshData =
      state.teamsChatsLastFetchedAt != null &&
      Date.now() - state.teamsChatsLastFetchedAt < CACHE_TTL_MS &&
      state.teamsChats.length > 0;

    if (!force && (state.teamsChatsLoading || hasFreshData)) return;
    if (!force && inFlightTeamsChatsFetch) return inFlightTeamsChatsFetch;

    const run = (async () => {
      set({ teamsChatsLoading: true, teamsChatsError: '' });
      try {
        const response = await fetch(`${apiBase}/api/slack/teams-chats`, { headers });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        set({
          teamsChats: Array.isArray(data) ? data : [],
          teamsChatsLastFetchedAt: Date.now(),
          teamsChatsLoading: false,
          teamsChatsError: '',
        });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to load Teams chats';
        set({
          teamsChatsLoading: false,
          teamsChatsError: message,
        });
      }
    })();

    inFlightTeamsChatsFetch = run.finally(() => {
      inFlightTeamsChatsFetch = null;
    });
    return inFlightTeamsChatsFetch;
  },
}));
