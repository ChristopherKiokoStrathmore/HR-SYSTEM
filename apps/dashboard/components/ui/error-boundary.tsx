'use client'

import { ErrorBoundary as ReactErrorBoundary } from 'react-error-boundary'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { motion } from 'framer-motion'

function ErrorFallback({
  error,
  resetErrorBoundary,
}: {
  error: unknown
  resetErrorBoundary: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl bg-surface p-8 flex flex-col items-center gap-4 text-center"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      <div className="w-14 h-14 rounded-2xl bg-danger/10 flex items-center justify-center">
        <AlertTriangle className="w-7 h-7 text-danger" />
      </div>
      <div>
        <h3 className="font-bold text-text-primary mb-1">Something went wrong</h3>
        <p className="text-sm text-text-muted max-w-xs">
          {error instanceof Error ? error.message : 'An unexpected error occurred in this section.'}
        </p>
      </div>
      <button
        onClick={resetErrorBoundary}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(135deg, #F47920, #E8650A)' }}
      >
        <RefreshCw className="w-4 h-4" />
        Try again
      </button>
    </motion.div>
  )
}

export function AppErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ReactErrorBoundary FallbackComponent={ErrorFallback}>
      {children}
    </ReactErrorBoundary>
  )
}
