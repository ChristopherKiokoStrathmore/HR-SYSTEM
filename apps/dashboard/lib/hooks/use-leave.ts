'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Leave } from '@hr/shared'

export interface LeaveFilters {
  employeeId?: string
  companyId?: string
  status?: string
  leaveType?: string
}

interface LeaveWithEmployee extends Leave {
  employee?: {
    employee_number: string
    job_title: string
    user?: { full_name: string; email: string }
  }
}

export function useLeaveRequests(filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: ['leave-requests', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.employeeId) params.set('employeeId', filters.employeeId)
      if (filters.companyId) params.set('companyId', filters.companyId)
      if (filters.status) params.set('status', filters.status)
      if (filters.leaveType) params.set('leaveType', filters.leaveType)
      const res = await fetch(`/api/leave?${params}`)
      if (!res.ok) throw new Error('Failed to fetch leave requests')
      return res.json() as Promise<{ data: LeaveWithEmployee[] }>
    },
  })
}

export function useLeaveBalances(employeeId: string | null) {
  return useQuery({
    queryKey: ['leave-balances', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/leave/balances?employeeId=${employeeId}`)
      if (!res.ok) throw new Error('Failed to fetch balances')
      return res.json()
    },
    enabled: !!employeeId,
  })
}

export function useActOnLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      action,
      rejection_reason,
    }: {
      id: string
      action: 'approve' | 'reject'
      rejection_reason?: string
    }) => {
      const res = await fetch(`/api/leave/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] })
    },
  })
}

export function useCreateLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Leave>) => {
      const res = await fetch('/api/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['leave-requests'] })
      qc.invalidateQueries({ queryKey: ['leave-balances'] })
    },
  })
}
