'use client'

import { useQuery } from '@tanstack/react-query'

export interface CurrentUser {
  user_id: string | null
  email: string | null
  full_name: string | null
  role: string | null
  company_id: string | null
}

// Roles permitted to switch between companies / view all companies.
const CROSS_COMPANY_ROLES = ['super_admin', 'company_admin']

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

export function canSwitchCompanies(role: string | null | undefined): boolean {
  return !!role && CROSS_COMPANY_ROLES.includes(role)
}
