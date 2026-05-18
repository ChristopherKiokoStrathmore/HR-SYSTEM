'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface LeaveBalance {
  id: string
  leave_type: string
  total_days: number
  used_days: number
  remaining_days: number
  year: number
}

export interface LeaveRequest {
  id: string
  leave_type: string
  start_date: string
  end_date: string
  days_requested: number
  reason: string
  status: string
  created_at: string
  rejection_reason: string | null
}

export function useLeaveBalances() {
  return useQuery<LeaveBalance[]>({
    queryKey: ['me', 'leave-balances'],
    queryFn: async () => {
      const res = await fetch('/api/me/leave/balances')
      if (!res.ok) throw new Error('Failed to load balances')
      const { data } = await res.json()
      return data
    },
  })
}

export function useLeaveRequests(status?: string) {
  return useQuery<LeaveRequest[]>({
    queryKey: ['me', 'leave', status],
    queryFn: async () => {
      const params = status ? `?status=${status}` : ''
      const res = await fetch(`/api/me/leave${params}`)
      if (!res.ok) throw new Error('Failed to load leave requests')
      const { data } = await res.json()
      return data
    },
  })
}

export function useRequestLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      leave_type: string
      start_date: string
      end_date: string
      days_requested: number
      reason: string
    }) => {
      const res = await fetch('/api/me/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['me', 'leave'] })
      qc.invalidateQueries({ queryKey: ['me', 'leave-balances'] })
    },
  })
}
