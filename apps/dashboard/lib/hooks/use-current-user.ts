'use client'

import { useQuery } from '@tanstack/react-query'

export interface CurrentUser {
  id: string
  full_name: string
  email: string
  role: 'super_admin' | 'hr_admin' | 'manager' | 'employee'
  avatar_url: string | null
  company_id: string | null
  is_active: boolean
}

export function useCurrentUser() {
  return useQuery<CurrentUser | null>({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me')
      if (!res.ok) return null
      const json = await res.json()
      return json.data ?? null
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
}

export function canAccess(role: string | undefined, path: string): boolean {
  if (!role) return false
  if (role === 'super_admin') return true
  if (role === 'hr_admin') return path !== '/settings' ? true : true // hr_admin can access settings

  const managerPaths = ['/', '/employees', '/leave', '/attendance', '/performance', '/training']
  if (role === 'manager') return managerPaths.some(p => p === path || (p !== '/' && path.startsWith(p)))

  return false // employee — no dashboard access
}
