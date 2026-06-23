'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import type { Reimbursement } from '@hr/shared'

export interface ReimbursementWithEmployee extends Reimbursement {
  employee_name?: string | null
  employee_number?: string | null
}

export function useReimbursements(statusFilter?: string) {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useQuery({
    queryKey: ['reimbursements', activeCompanyId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeCompanyId) params.set('company_id', activeCompanyId)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/hr/reimbursements?${params}`)
      if (!res.ok) throw new Error('Failed to fetch reimbursements')
      return res.json() as Promise<ReimbursementWithEmployee[]>
    },
    enabled: !!activeCompanyId,
  })
}

export function useProcessReimbursement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      payment_reference,
    }: {
      id: string
      decision: 'approved' | 'rejected' | 'paid'
      payment_reference?: string
    }) => {
      const res = await fetch(`/api/hr/reimbursements/${id}/process/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision, payment_reference }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to process')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reimbursements'] }),
  })
}
