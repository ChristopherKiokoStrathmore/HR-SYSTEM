'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import type { WorkZone } from '@hr/shared'

export function useWorkZones() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useQuery({
    queryKey: ['work-zones', activeCompanyId],
    queryFn: async () => {
      const res = await fetch(`/api/work-zones?company_id=${activeCompanyId}`)
      if (!res.ok) throw new Error('Failed to fetch work zones')
      return res.json() as Promise<WorkZone[]>
    },
  })
}

export function useCreateWorkZone() {
  const queryClient = useQueryClient()
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useMutation({
    mutationFn: async (data: Partial<WorkZone>) => {
      const res = await fetch('/api/work-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create work zone')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-zones', activeCompanyId] })
    },
  })
}

export function useUpdateWorkZone() {
  const queryClient = useQueryClient()
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useMutation({
    mutationFn: async ({ id, ...data }: Partial<WorkZone> & { id: string }) => {
      const res = await fetch(`/api/work-zones/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to update work zone')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-zones', activeCompanyId] })
    },
  })
}

export function useDeleteWorkZone() {
  const queryClient = useQueryClient()
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/work-zones/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete work zone')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-zones', activeCompanyId] })
    },
  })
}

export function useAssignZoneEmployees() {
  const queryClient = useQueryClient()
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useMutation({
    mutationFn: async ({ zoneId, employeeIds }: { zoneId: string; employeeIds: string[] }) => {
      const res = await fetch(`/api/work-zones/${zoneId}/assign-employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_ids: employeeIds }),
      })
      if (!res.ok) throw new Error('Failed to assign employees')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['work-zones', activeCompanyId] })
    },
  })
}
