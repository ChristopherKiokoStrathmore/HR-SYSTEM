'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import type { GeofenceViolation } from '@hr/shared'

export interface GeofenceViolationWithEmployee extends GeofenceViolation {
  employee_name?: string | null
  employee_number?: string | null
  zone_name?: string | null
}

export function useGeofenceViolations(statusFilter?: string) {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useQuery({
    queryKey: ['geofence-violations', activeCompanyId, statusFilter],
    queryFn: async () => {
      let url = `/api/geofence/violations?company_id=${activeCompanyId}`
      if (statusFilter) url += `&status=${statusFilter}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch violations')
      return res.json() as Promise<GeofenceViolationWithEmployee[]>
    },
  })
}

export function useResolveViolation() {
  const queryClient = useQueryClient()
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const res = await fetch(`/api/geofence/violations/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })
      if (!res.ok) throw new Error('Failed to resolve violation')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['geofence-violations', activeCompanyId] })
    },
  })
}
