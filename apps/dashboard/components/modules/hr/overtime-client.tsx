'use client'

import { useState } from 'react'
import { useOvertimeRequests, useDecideOvertime } from '@/lib/hooks/use-overtime'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { SkeletonTable } from '@/components/ui/skeleton'
import { LottieEmpty } from '@/components/ui/lottie-empty'
import { toast } from '@/lib/toast'
import { formatDate } from '@hr/shared'
import { CheckCircle, XCircle, Clock, Filter, ChevronDown, Timer } from 'lucide-react'

export function OvertimeClient() {
  const [statusFilter, setStatusFilter] = useState('')
  const { data, isLoading } = useOvertimeRequests(statusFilter || undefined)
  const decide = useDecideOvertime()

  const requests = Array.isArray(data) ? data : []
  const pending = requests.filter(r => r.status === 'pending').length
  const approved = requests.filter(r => r.status === 'approved').length

  async function handleDecide(id: string, action: 'approve' | 'reject') {
    try {
      await decide.mutateAsync({ id, action })
      toast.success(`Overtime ${action === 'approve' ? 'approved' : 'rejected'}`)
    } catch {
      toast.error(`Failed to ${action} overtime request`)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Overtime Requests</h1>
          <p className="text-sm text-text-muted mt-0.5">{pending} pending approval</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-600' },
          { label: 'Approved', value: approved, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Total', value: requests.length, icon: Timer, color: 'text-text-primary' },
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
          <h3 className="text-sm font-semibold text-text-primary">Overtime Requests</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : requests.length === 0 ? (
          <LottieEmpty message="No overtime requests" description="Overtime requests submitted by employees will appear here." />
        ) : (
          <div className="divide-y divide-border">
            {requests.map(req => {
              const name = req.employee_name ?? `Employee ${String(req.employee_id).slice(0, 8)}`
              return (
                <div key={req.id} className="flex items-center gap-4 px-4 py-3">
                  <Avatar name={name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 font-medium">
                        {req.hours}h × {req.rate_multiplier}x
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatDate(req.date)}
                      {req.reason && <> · <span className="italic">"{req.reason}"</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusBadge status={req.status} />
                    {req.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleDecide(req.id, 'approve')}
                          disabled={decide.isPending}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleDecide(req.id, 'reject')}
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

export { OvertimeClient as OvertimeRequestsClient }
