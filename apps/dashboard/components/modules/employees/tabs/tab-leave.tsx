'use client'

import { useQuery } from '@tanstack/react-query'
import { StatusBadge } from '@/components/ui/badge'
import { SkeletonTable } from '@/components/ui/skeleton'
import { formatDate } from '@hr/shared'
import type { Leave, LeaveBalance } from '@hr/shared'

export function TabLeave({ employeeId }: { employeeId: string }) {
  const { data: balances, isLoading: balLoading } = useQuery({
    queryKey: ['leave-balances', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/leave/balances?employeeId=${employeeId}`)
      return res.json() as Promise<{ data: LeaveBalance[] }>
    },
  })

  const { data: requests, isLoading: reqLoading } = useQuery({
    queryKey: ['leaves', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/leave?employeeId=${employeeId}`)
      return res.json() as Promise<{ data: Leave[] }>
    },
  })

  return (
    <div className="space-y-5">
      {/* Balances */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Leave Balances (Current Year)</h3>
        {balLoading ? <SkeletonTable rows={3} /> : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(balances?.data ?? []).map((b) => (
              <div key={b.id} className="bg-surface-alt rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-text-primary">{b.remaining_days}</p>
                <p className="text-xs text-text-muted capitalize mt-0.5">{b.leave_type.replace('_', ' ')}</p>
                <p className="text-xs text-text-muted">{b.used_days}/{b.total_days} used</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Leave history */}
      <div className="card">
        <h3 className="text-sm font-semibold text-text-primary mb-4">Leave History</h3>
        {reqLoading ? <SkeletonTable rows={4} /> : (
          <div className="divide-y divide-border">
            {(requests?.data ?? []).length === 0 && (
              <p className="text-text-muted text-sm py-4 text-center">No leave requests found.</p>
            )}
            {(requests?.data ?? []).map((leave) => (
              <div key={leave.id} className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary capitalize">
                    {leave.leave_type.replace('_', ' ')}
                  </p>
                  <p className="text-xs text-text-muted">
                    {formatDate(leave.start_date)} → {formatDate(leave.end_date)} · {leave.days_requested} days
                  </p>
                </div>
                <StatusBadge status={leave.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
