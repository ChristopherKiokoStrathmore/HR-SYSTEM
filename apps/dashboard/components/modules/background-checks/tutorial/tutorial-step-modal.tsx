'use client'

import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Lightbulb, ShieldCheck } from 'lucide-react'
import type { TutorialStep } from './tutorial-steps'

interface TutorialStepContentProps {
  step: TutorialStep
  currentIndex: number
  totalSteps: number
  onNext: () => void
  onPrev: () => void
  onSkip: () => void
  isFullModal?: boolean
}

export function TutorialStepContent({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isFullModal = false,
}: TutorialStepContentProps) {
  const isLastStep = currentIndex === totalSteps - 1
  const isFirstStep = currentIndex === 0

  const content = (
    <>
      {/* Step indicator */}
      <div className="flex items-center gap-1.5 mb-4">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-1.5 rounded-full transition-all duration-300',
              i < currentIndex
                ? 'bg-accent w-3'
                : i === currentIndex
                  ? 'bg-accent w-6'
                  : 'bg-border w-3'
            )}
          />
        ))}
        <span className="ml-auto text-xs text-text-muted">
          {currentIndex + 1} of {totalSteps}
        </span>
      </div>

      {/* Icon for modal type */}
      {isFullModal && (
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-accent" />
          </div>
        </div>
      )}

      {/* Content */}
      <div className="mb-5">
        <h3 className={cn(
          'font-bold text-text-primary mb-2',
          isFullModal ? 'text-xl text-center' : 'text-lg'
        )}>
          {step.title}
        </h3>
        <p className={cn(
          'text-sm text-text-body leading-relaxed',
          isFullModal && 'text-center'
        )}>
          {step.description}
        </p>
        {step.tip && (
          <div className={cn(
            'mt-3 p-3 bg-accent/10 rounded-lg flex items-start gap-2',
            isFullModal && 'text-left'
          )}>
            <Lightbulb className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
            <p className="text-xs text-accent font-medium">{step.tip}</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={onSkip}
          className="text-sm text-text-muted hover:text-text-body transition-colors"
        >
          Skip Tutorial
        </button>
        <div className="flex gap-2">
          {!isFirstStep && (
            <button onClick={onPrev} className="btn-ghost text-sm px-4">
              Back
            </button>
          )}
          <button onClick={onNext} className="btn-primary text-sm px-4">
            {isLastStep ? 'Get Started' : 'Next'}
          </button>
        </div>
      </div>
    </>
  )

  if (isFullModal) {
    return content
  }

  return (
    <div className="bg-surface rounded-2xl p-5 shadow-xl border border-border">
      {content}
    </div>
  )
}

// Full screen modal for welcome/completion steps
export function TutorialFullModal({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
}: Omit<TutorialStepContentProps, 'isFullModal'>) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />

      {/* Modal */}
      <motion.div
        className="relative bg-surface rounded-2xl p-8 shadow-2xl max-w-lg w-full mx-4 border border-border"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        <TutorialStepContent
          step={step}
          currentIndex={currentIndex}
          totalSteps={totalSteps}
          onNext={onNext}
          onPrev={onPrev}
          onSkip={onSkip}
          isFullModal
        />
      </motion.div>
    </div>
  )
}
