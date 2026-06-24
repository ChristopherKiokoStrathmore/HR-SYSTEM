'use client'

import { ReactNode } from 'react'
import { usePermission } from '@/lib/hooks/use-permissions'

/**
 * Part B1 (frontend) — wrap an action/element so it only renders (or is enabled)
 * when the user holds `resource.action`.
 *
 *   <Can resource="payroll" action="approve">
 *     <button>Approve</button>
 *   </Can>
 *
 * `mode="disable"` keeps children mounted but greys them out instead of hiding.
 */
export function Can({
  resource,
  action,
  children,
  fallback = null,
  mode = 'hide',
}: {
  resource: string
  action: string
  children: ReactNode
  fallback?: ReactNode
  mode?: 'hide' | 'disable'
}) {
  const allowed = usePermission(resource, action)
  if (allowed) return <>{children}</>
  if (mode === 'disable') {
    return (
      <span className="opacity-50 pointer-events-none cursor-not-allowed" aria-disabled>
        {children}
      </span>
    )
  }
  return <>{fallback}</>
}
