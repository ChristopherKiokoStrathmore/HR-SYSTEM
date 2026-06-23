'use client'

import { useState } from 'react'
import { useLeaveRecalls, useDecideLeaveRecall } from '@/lib/hooks/use-leave-recalls'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { SkeletonTable } from '@/components/ui/skeleton'
import { LottieEmpty } from '@/components/ui/lottie-empty'
import { toast } from '@/lib/toast'
import { formatDate } from '@hr/shared'
import { CheckCircle, XCircle, Clock, Filter, ChevronDown, RotateCcw } from 'lucide-react'

export function LeaveRecallsClient() {
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading } = useLeaveRecalls(statusFilter || undefined)
  const decide = useDecideLeaveRecall()

  const recalls = Array.isArray(data) ? data : []
  const pending = recalls.filter(r => r.status === 'pending').length

  async function handleDecide(id: string, action: 'approve' | 'reject') {
    try {
      await decide.mutateAsync({ id, action })
      toast.success(`Leave recall ${action === 'approve' ? 'approved' : 'rejected'}`)
    } catch {
      toast.error(`Failed to ${action} leave recall`)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Leave Recalls</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {pending} recall{pending !== 1 ? 's' : ''} pending decision
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-600' },
          { label: 'Approved', value: recalls.filter(r => r.status === 'approved').length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Total', value: recalls.length, icon: RotateCcw, color: 'text-text-primary' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative w-fit">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <select
          className="input pl-9 pr-8 appearance-none cursor-pointer"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Leave Recall Requests</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : recalls.length === 0 ? (
          <LottieEmpty message="No leave recalls" description="Leave recall requests initiated by managers will appear here." />
        ) : (
          <div className="divide-y divide-border">
            {recalls.map(recall => {
              const name = recall.employee_name ?? `Employee ${String(recall.employee_id).slice(0, 8)}`
              return (
                <div key={recall.id} className="flex items-center gap-4 px-4 py-3">
                  <Avatar name={name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Resume {formatDate(recall.resume_date)}
                      {recall.days_credited != null && <> · {recall.days_credited} days credited</>}
                      {recall.reason && <> · <span className="italic">"{recall.reason}"</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={recall.status} />
                    {recall.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleDecide(recall.id, 'approve')}
                          disabled={decide.isPending}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleDecide(recall.id, 'reject')}
                          disabled={decide.isPending}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
