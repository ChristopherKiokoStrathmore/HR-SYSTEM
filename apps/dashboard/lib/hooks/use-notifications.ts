'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import type { NotificationTemplate } from '@hr/shared'

export function useNotificationTemplates() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useQuery({
    queryKey: ['notification-templates', activeCompanyId],
    queryFn: async () => {
      const res = await fetch(`/api/notifications/templates?company_id=${activeCompanyId}`)
      if (!res.ok) throw new Error('Failed to fetch templates')
      return res.json() as Promise<NotificationTemplate[]>
    },
  })
}

export function useCreateTemplate() {
  const queryClient = useQueryClient()
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useMutation({
    mutationFn: async (data: Partial<NotificationTemplate>) => {
      const res = await fetch('/api/notifications/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create template')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates', activeCompanyId] })
    },
  })
}

export function useUpdateTemplate() {
  const queryClient = useQueryClient()
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<NotificationTemplate> & { id: string }) => {
      const res = await fetch(`/api/notifications/templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update template')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates', activeCompanyId] })
    },
  })
}

export function useDeleteTemplate() {
  const queryClient = useQueryClient()
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/notifications/templates/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete template')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notification-templates', activeCompanyId] })
    },
  })
}
