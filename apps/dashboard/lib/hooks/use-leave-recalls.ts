'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import type { LeaveRecall } from '@hr/shared'

export interface LeaveRecallWithEmployee extends LeaveRecall {
  employee_name?: string | null
  employee_number?: string | null
}

export function useLeaveRecalls(statusFilter?: string) {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useQuery({
    queryKey: ['leave-recalls', activeCompanyId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeCompanyId) params.set('company_id', activeCompanyId)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/hr/leave-recalls?${params}`)
      if (!res.ok) throw new Error('Failed to fetch leave recalls')
      return res.json() as Promise<LeaveRecallWithEmployee[]>
    },
    enabled: !!activeCompanyId,
  })
}

export function useDecideLeaveRecall() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'approve' | 'reject' }) => {
      const res = await fetch(`/api/hr/leave-recalls/${id}/${action}/`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error ?? `Failed to ${action}`)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['leave-recalls'] }),
  })
}
