'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type Language = 'en' | 'sw'

interface PwaStore {
  language: Language
  setLanguage: (lang: Language) => void
}

export const useStore = create<PwaStore>()(
  persist(
    (set) => ({
      language: 'en',
      setLanguage: (language) => set({ language }),
    }),
    { name: 'sl-hr-pwa' }
  )
)
