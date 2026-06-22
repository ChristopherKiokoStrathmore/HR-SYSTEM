'use client'

import { useQuery } from '@tanstack/react-query'
import {
  canSwitchCompanies as canSwitchCompaniesFn,
  normalizeRole,
  can,
  canAccessPath,
  type AppRole,
} from '@/lib/rbac'

export interface CurrentUser {
  user_id: string | null
  email: string | null
  full_name: string | null
  role: string | null
  company_id: string | null
}

/**
 * The current signed-in user (role/company), read from the httpOnly session
 * cookie via /api/auth/session. Used for role-based UI gating.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      const res = await fetch('/api/auth/session')
      if (!res.ok) return { user: null as CurrentUser | null }
      return res.json() as Promise<{ user: CurrentUser | null }>
    },
    staleTime: 5 * 60 * 1000,
  })
}

/**
 * RBAC helpers bound to the current user's role. Use in client components to
 * gate nav items, routes, and actions.
 */
export function useRbac(): {
  role: AppRole
  loading: boolean
  can: (capability: string) => boolean
  canAccess: (path: string) => boolean
  canSwitchCompanies: boolean
} {
  const { data, isLoading } = useCurrentUser()
  const role = normalizeRole(data?.user?.role)
  return {
    role,
    loading: isLoading,
    can: (capability: string) => can(role, capability),
    canAccess: (path: string) => canAccessPath(role, path),
    canSwitchCompanies: canSwitchCompaniesFn(data?.user?.role),
  }
}

// Back-compat re-export (header.tsx imports this).
export function canSwitchCompanies(role: string | null | undefined): boolean {
  return canSwitchCompaniesFn(role)
}
