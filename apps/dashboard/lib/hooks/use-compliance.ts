'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import type { ComplianceAlert } from '@hr/shared'

export function useComplianceAlerts(statusFilter?: string) {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  return useQuery({
    queryKey: ['compliance-alerts', activeCompanyId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeCompanyId) params.set('company_id', activeCompanyId)
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/hr/compliance-alerts?${params}`)
      if (!res.ok) throw new Error('Failed to fetch compliance alerts')
      return res.json() as Promise<ComplianceAlert[]>
    },
    enabled: !!activeCompanyId,
  })
}

export function useAcknowledgeAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'acknowledged' | 'resolved' }) => {
      const res = await fetch(`/api/hr/compliance-alerts/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to update alert')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance-alerts'] }),
  })
}
