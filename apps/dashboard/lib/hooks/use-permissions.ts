'use client'

import { useQuery } from '@tanstack/react-query'

/**
 * Part B1 (frontend) — permission context backed by the Django
 * GET /api/rbac/me/ endpoint (proxied via /api/hr/rbac/me).
 *
 * `usePermission(resource, action)` returns whether the current user may
 * perform `resource.action`. To avoid hiding everything for users who have not
 * yet been granted UserRole rows (the RBAC rollout is additive and the backend
 * runs in soft-enforcement until RBAC_ENFORCE flips), resolution fails OPEN
 * when the caller has no resolved permission set at all. Once a user has any
 * grants, the set is authoritative.
 */
export interface MePermissions {
  user_id: string | null
  organization: { id: string; name: string; type: string } | null
  roles: { id: string; name: string; organization_id: string }[]
  permissions: string[]
  is_super_admin: boolean
}

export function usePermissions() {
  return useQuery({
    queryKey: ['rbac-me'],
    queryFn: async () => {
      const res = await fetch('/api/hr/rbac/me')
      if (!res.ok) throw new Error('Failed to load permissions')
      return (await res.json()) as MePermissions
    },
    staleTime: 60_000,
    retry: false,
  })
}

export function usePermission(resource: string, action: string): boolean {
  const { data } = usePermissions()
  return hasPermission(data, resource, action)
}

export function hasPermission(
  data: MePermissions | undefined,
  resource: string,
  action: string
): boolean {
  if (!data) return true // not loaded yet — don't flash-hide
  if (data.is_super_admin) return true
  const set = data.permissions || []
  // Fail open only when the user has NO resolved grants at all (pre-rollout).
  if (set.length === 0) return true
  return set.includes(`${resource}.${action}`)
}

/** True only when permission data is loaded and the grant is explicitly absent. */
export function useIsDenied(resource: string, action: string): boolean {
  const { data, isLoading } = usePermissions()
  if (isLoading || !data) return false
  if (data.is_super_admin) return false
  const set = data.permissions || []
  if (set.length === 0) return false
  return !set.includes(`${resource}.${action}`)
}
