import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Payment methods supported by PesaPal
export type PaymentMethodType = 'mpesa' | 'bank' | 'airtel'

// Legacy type for backwards compatibility
export type PaymentSourceType = 'mpesa_wallet' | 'bank_wallet'

// Payment source configuration
export interface PaymentSource {
  id: string
  name: string
  method: PaymentMethodType
  icon: 'smartphone' | 'banknote' | 'phone'
  color: string
  description: string
}

export const PAYMENT_SOURCES: PaymentSource[] = [
  {
    id: 'bank',
    name: 'Bank Transfer',
    method: 'bank',
    icon: 'banknote',
    color: 'primary',
    description: 'Pay via bank EFT transfer',
  },
  {
    id: 'mpesa',
    name: 'M-Pesa',
    method: 'mpesa',
    icon: 'smartphone',
    color: 'green',
    description: 'Pay via Safaricom M-Pesa',
  },
  {
    id: 'airtel',
    name: 'Airtel Money',
    method: 'airtel',
    icon: 'phone',
    color: 'red',
    description: 'Pay via Airtel Money',
  },
]

interface AppStore {
  sidebarCollapsed: boolean
  toggleSidebar: () => void

  darkMode: boolean
  toggleDarkMode: () => void

  activeCompanyId: string | null
  setActiveCompanyId: (id: string | null) => void

  // Payment source for payroll disbursement (legacy)
  paymentSource: PaymentSourceType
  setPaymentSource: (source: PaymentSourceType) => void

  // PesaPal payment method for payroll disbursement
  paymentMethod: PaymentMethodType
  setPaymentMethod: (method: PaymentMethodType) => void
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

      paymentMethod: 'bank',
      setPaymentMethod: (method) => set({ paymentMethod: method }),
    }),
    {
      name: 'hr-dashboard-store',
      partialize: (s) => ({
        sidebarCollapsed: s.sidebarCollapsed,
        darkMode: s.darkMode,
        activeCompanyId: s.activeCompanyId,
        paymentSource: s.paymentSource,
        paymentMethod: s.paymentMethod,
      }),
    }
  )
)
