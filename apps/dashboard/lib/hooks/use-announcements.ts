'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import type { Announcement } from '@hr/shared'

export function useAnnouncements(department?: string) {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useQuery({
    queryKey: ['announcements', activeCompanyId, department],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeCompanyId) params.set('company_id', activeCompanyId)
      if (department) params.set('department', department)
      const res = await fetch(`/api/hr/announcements?${params}`)
      if (!res.ok) throw new Error('Failed to fetch announcements')
      return res.json() as Promise<Announcement[]>
    },
    enabled: !!activeCompanyId,
  })
}

export function useCreateAnnouncement() {
  const qc = useQueryClient()
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useMutation({
    mutationFn: async (body: Partial<Announcement>) => {
      const res = await fetch('/api/hr/announcements/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, company_id: activeCompanyId }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Announcement> & { id: string }) => {
      const res = await fetch(`/api/hr/announcements/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to update')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hr/announcements/${id}/`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['announcements'] }),
  })
}
