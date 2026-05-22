import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TUTORIAL_STEPS } from './tutorial-steps'

interface TutorialState {
  // Active state
  isActive: boolean
  currentStep: number

  // Demo mode - shows mock data instead of real data
  isDemoMode: boolean

  // Completion tracking (persisted)
  hasCompletedTutorial: boolean

  // Actions
  startTutorial: () => void
  nextStep: () => void
  prevStep: () => void
  skipTutorial: () => void
  completeTutorial: () => void
  resetTutorial: () => void
}

export const useTutorialState = create<TutorialState>()(
  persist(
    (set, get) => ({
      isActive: false,
      currentStep: 0,
      isDemoMode: false,
      hasCompletedTutorial: false,

      startTutorial: () => set({
        isActive: true,
        currentStep: 0,
        isDemoMode: true,
      }),

      nextStep: () => {
        const { currentStep } = get()
        if (currentStep < TUTORIAL_STEPS.length - 1) {
          set({ currentStep: currentStep + 1 })
        } else {
          // Last step - complete tutorial
          get().completeTutorial()
        }
      },

      prevStep: () => set((s) => ({
        currentStep: Math.max(0, s.currentStep - 1)
      })),

      skipTutorial: () => set({
        isActive: false,
        currentStep: 0,
        isDemoMode: false,
      }),

      completeTutorial: () => set({
        isActive: false,
        currentStep: 0,
        isDemoMode: false,
        hasCompletedTutorial: true,
      }),

      resetTutorial: () => set({
        hasCompletedTutorial: false,
        currentStep: 0,
      }),
    }),
    {
      name: 'bg-check-tutorial',
      partialize: (s) => ({ hasCompletedTutorial: s.hasCompletedTutorial }),
    }
  )
)

// Hook to check if we're in demo mode
export const useDemoMode = () => useTutorialState((s) => s.isDemoMode)
