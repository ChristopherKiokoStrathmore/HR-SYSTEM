'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import type { OvertimeRequest } from '@hr/shared'

export interface OvertimeWithEmployee extends OvertimeRequest {
  employee_name?: string | null
  employee_number?: string | null
}

export function useOvertimeRequests(statusFilter?: string) {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useQuery({
    queryKey: ['overtime', activeCompanyId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeCompanyId) params.set('company_id', activeCompanyId)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/hr/overtime?${params}`)
      if (!res.ok) throw new Error('Failed to fetch overtime requests')
      return res.json() as Promise<OvertimeWithEmployee[]>
    },
    enabled: !!activeCompanyId,
  })
}

export function useDecideOvertime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const res = await fetch(`/api/hr/overtime/${id}/${action}/`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error ?? `Failed to ${action}`)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['overtime'] }),
  })
}
