'use client'

import * as Toast from '@radix-ui/react-toast'
import { X } from 'lucide-react'
import { useToastStore } from '@/lib/toast'
import { cn } from '@/lib/utils'

export function Toaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <Toast.Provider swipeDirection="right">
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          open={!toast.dismissed}
          onOpenChange={(open) => { if (!open) dismiss(toast.id) }}
          className={cn(
            'flex items-start gap-3 rounded-lg border p-4 shadow-lg bg-surface',
            'data-[state=open]:animate-slide-in data-[state=closed]:animate-fade-in',
            toast.variant === 'error' && 'border-danger/30',
            toast.variant === 'success' && 'border-success/30',
            toast.variant === 'warning' && 'border-warning/30',
            (!toast.variant || toast.variant === 'default') && 'border-border'
          )}
        >
          <div className="flex-1 min-w-0">
            {toast.title && (
              <Toast.Title className="font-medium text-sm text-text-primary">
                {toast.title}
              </Toast.Title>
            )}
            {toast.description && (
              <Toast.Description className="text-sm text-text-muted mt-0.5">
                {toast.description}
              </Toast.Description>
            )}
          </div>
          <Toast.Close
            onClick={() => dismiss(toast.id)}
            className="text-text-muted hover:text-text-body flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </Toast.Close>
        </Toast.Root>
      ))}
      <Toast.Viewport className="fixed bottom-4 right-4 flex flex-col gap-2 w-96 max-w-[100vw] z-50" />
    </Toast.Provider>
  )
}
