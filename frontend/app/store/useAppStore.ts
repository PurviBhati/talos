import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type NavSection =
  | 'governance'
  | 'teams'
  | 'slack'
  | 'whatsapp'
  | 'tasks'
  | 'link-reads'
  | 'admin'
  | 'settings'
  | 'summaries'
  | 'forward-log'

type SetStateArg<T> = T | ((prev: T) => T)

interface AppStore {
  // Navigation
  activeNav: NavSection
  setActiveNav: (nav: NavSection) => void

  // Theme
  theme: 'dark' | 'light'
  setTheme: (theme: SetStateArg<'dark' | 'light'>) => void
  toggleTheme: () => void

  // Sound
  soundEnabled: boolean
  setSoundEnabled: (enabled: SetStateArg<boolean>) => void
  toggleSound: () => void

  // Layout
  sidebarCollapsed: boolean
  setSidebarCollapsed: (collapsed: SetStateArg<boolean>) => void
  isMobile: boolean
  setIsMobile: (mobile: SetStateArg<boolean>) => void

  // Badge Counts
  draftCount: number
  setDraftCount: (value: number) => void
  teamsCount: number
  setTeamsCount: (value: number) => void
  slackCount: number
  setSlackCount: (value: number) => void
  waCount: number
  setWaCount: (value: number) => void
  summaryCount: number
  setSummaryCount: (value: number) => void
  setCounts: (counts: Partial<{
    draftCount: number
    teamsCount: number
    slackCount: number
    waCount: number
    summaryCount: number
  }>) => void
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Navigation
      activeNav: 'governance',
      setActiveNav: (nav) => set({ activeNav: nav }),

      // Theme
      theme: 'dark',
      setTheme: (theme) =>
        set((state) => ({
          theme: typeof theme === 'function' ? (theme as (prev: 'dark' | 'light') => 'dark' | 'light')(state.theme) : theme,
        })),
      toggleTheme: () =>
        set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

      // Sound
      soundEnabled: true,
      setSoundEnabled: (enabled) =>
        set((state) => ({
          soundEnabled: typeof enabled === 'function' ? (enabled as (prev: boolean) => boolean)(state.soundEnabled) : enabled,
        })),
      toggleSound: () =>
        set((state) => ({ soundEnabled: !state.soundEnabled })),

      // Layout
      sidebarCollapsed: false,
      setSidebarCollapsed: (collapsed) =>
        set((state) => ({
          sidebarCollapsed: typeof collapsed === 'function' ? (collapsed as (prev: boolean) => boolean)(state.sidebarCollapsed) : collapsed,
        })),
      isMobile: false,
      setIsMobile: (mobile) =>
        set((state) => ({
          isMobile: typeof mobile === 'function' ? (mobile as (prev: boolean) => boolean)(state.isMobile) : mobile,
        })),

      // Badge Counts
      draftCount: 0,
      setDraftCount: (value) => set({ draftCount: value }),
      teamsCount: 0,
      setTeamsCount: (value) => set({ teamsCount: value }),
      slackCount: 0,
      setSlackCount: (value) => set({ slackCount: value }),
      waCount: 0,
      setWaCount: (value) => set({ waCount: value }),
      summaryCount: 0,
      setSummaryCount: (value) => set({ summaryCount: value }),
      setCounts: (counts) => set((state) => ({ ...state, ...counts })),
    }),
    {
      name: 'openclaw-app-store', // replaces your manual localStorage calls
      partialize: (state) => ({
        theme: state.theme,
        soundEnabled: state.soundEnabled,
        activeNav: state.activeNav,
      }), // only persist these 3 — counts always refetch fresh
    }
  )
)