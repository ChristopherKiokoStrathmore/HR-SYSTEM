'use client'

import { useEffect, useCallback } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useTutorialState } from './use-tutorial-state'
import { TUTORIAL_STEPS, type TargetRef } from './tutorial-steps'
import { TutorialOverlay } from './tutorial-overlay'
import { TutorialStepContent, TutorialFullModal } from './tutorial-step-modal'

export interface TutorialRefs {
  stats: React.RefObject<HTMLDivElement>
  alerts: React.RefObject<HTMLDivElement>
  table: React.RefObject<HTMLDivElement>
  addButton: React.RefObject<HTMLButtonElement>
  filter: React.RefObject<HTMLDivElement>
}

interface BackgroundCheckTutorialProps {
  refs: TutorialRefs
}

export function BackgroundCheckTutorial({ refs }: BackgroundCheckTutorialProps) {
  const {
    isActive,
    currentStep,
    nextStep,
    prevStep,
    skipTutorial,
  } = useTutorialState()

  const step = TUTORIAL_STEPS[currentStep]
  const totalSteps = TUTORIAL_STEPS.length

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isActive) return

    switch (e.key) {
      case 'ArrowRight':
      case 'Enter':
        e.preventDefault()
        nextStep()
        break
      case 'ArrowLeft':
        e.preventDefault()
        prevStep()
        break
      case 'Escape':
        e.preventDefault()
        skipTutorial()
        break
    }
  }, [isActive, nextStep, prevStep, skipTutorial])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Scroll target element into view
  useEffect(() => {
    if (!isActive || !step.targetRef) return

    const ref = refs[step.targetRef as keyof TutorialRefs]
    if (ref?.current) {
      ref.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      })
    }
  }, [isActive, step, refs])

  if (!isActive) return null

  // Get the target ref for the current step
  const getTargetRef = (targetRef: TargetRef) => {
    if (!targetRef) return null
    return refs[targetRef as keyof TutorialRefs] || null
  }

  // Modal type steps (welcome, complete)
  if (step.type === 'modal') {
    return (
      <AnimatePresence mode="wait">
        <TutorialFullModal
          key={step.id}
          step={step}
          currentIndex={currentStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTutorial}
        />
      </AnimatePresence>
    )
  }

  // Spotlight type steps
  return (
    <AnimatePresence mode="wait">
      <TutorialOverlay
        key={step.id}
        targetRef={getTargetRef(step.targetRef)}
        position={step.position}
        isActive={isActive}
      >
        <TutorialStepContent
          step={step}
          currentIndex={currentStep}
          totalSteps={totalSteps}
          onNext={nextStep}
          onPrev={prevStep}
          onSkip={skipTutorial}
        />
      </TutorialOverlay>
    </AnimatePresence>
  )
}
