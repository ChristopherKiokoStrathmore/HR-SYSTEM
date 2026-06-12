import { create } from 'zustand'

export interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'success' | 'error' | 'warning'
  dismissed?: boolean
}

interface ToastStore {
  toasts: ToastItem[]
  toast: (item: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  toast: (item) => {
    const id = Math.random().toString(36).slice(2)
    set((s) => ({ toasts: [...s.toasts, { ...item, id }] }))
    setTimeout(() => {
      set((s) => ({
        toasts: s.toasts.map((t) => (t.id === id ? { ...t, dismissed: true } : t)),
      }))
    }, 5000)
  },
  dismiss: (id) =>
    set((s) => ({
      toasts: s.toasts.map((t) => (t.id === id ? { ...t, dismissed: true } : t)),
    })),
}))

export const toast = {
  success: (title: string, description?: string) =>
    useToastStore.getState().toast({ title, description, variant: 'success' }),
  error: (title: string, description?: string) =>
    useToastStore.getState().toast({ title, description, variant: 'error' }),
  warning: (title: string, description?: string) =>
    useToastStore.getState().toast({ title, description, variant: 'warning' }),
  info: (title: string, description?: string) =>
    useToastStore.getState().toast({ title, description, variant: 'default' }),
}
