import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type PaymentSourceType = 'mpesa_wallet' | 'bank_wallet'

interface AppStore {
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  darkMode: boolean
  toggleDarkMode: () => void

  activeCompanyId: string | null
  setActiveCompanyId: (id: string | null) => void

  // Payment source for payroll disbursement
  paymentSource: PaymentSourceType
  setPaymentSource: (source: PaymentSourceType) => void
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

      paymentSource: 'bank_wallet',
      setPaymentSource: (source) => set({ paymentSource: source }),
    }),
    {
      name: 'hr-dashboard-store',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        darkMode: s.darkMode,
        activeCompanyId: s.activeCompanyId,
        paymentSource: s.paymentSource,
      }),
    }
  )
)
