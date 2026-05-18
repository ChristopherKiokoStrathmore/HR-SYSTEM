import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStore {
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  darkMode: boolean
  toggleDarkMode: () => void

  activeCompanyId: string | null
  setActiveCompanyId: (id: string | null) => void
}

export const useStore = create<AppStore>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      darkMode: false,
      toggleDarkMode: () =>
        set((s) => {
          const next = !s.darkMode
          if (next) document.documentElement.classList.add('dark')
          else document.documentElement.classList.remove('dark')
          return { darkMode: next }
        }),

      activeCompanyId: null,
      setActiveCompanyId: (id) => set({ activeCompanyId: id }),
    }),
    {
      name: 'hr-dashboard-store',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        darkMode: s.darkMode,
        activeCompanyId: s.activeCompanyId,
      }),
    }
  )
)
