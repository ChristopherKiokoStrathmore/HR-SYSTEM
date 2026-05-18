'use client'

import { useState } from 'react'
import { useLeaveRequests, useActOnLeave } from '@/lib/hooks/use-leave'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { SkeletonTable } from '@/components/ui/skeleton'
import { toast } from '@/lib/toast'
import { formatDate } from '@hr/shared'
import type { Leave, LeaveType } from '@hr/shared'
import { useStore } from '@/lib/store'
import { LottieEmpty } from '@/components/ui/lottie-empty'
import {
  CheckCircle, XCircle, Calendar, Filter, ChevronDown,
  Clock, CalendarCheck, Users,
} from 'lucide-react'

const LEAVE_TYPE_LABELS: Record<LeaveType, string> = {
  annual: 'Annual',
  sick: 'Sick',
  maternity: 'Maternity',
  paternity: 'Paternity',
  study: 'Study',
  compassionate: 'Compassionate',
  unpaid: 'Unpaid',
  adoption: 'Adoption',
  family: 'Family',
}

const LEAVE_TYPE_COLORS: Record<string, string> = {
  annual: 'bg-blue-50 text-blue-700',
  sick: 'bg-red-50 text-red-700',
  maternity: 'bg-pink-50 text-pink-700',
  paternity: 'bg-purple-50 text-purple-700',
  study: 'bg-amber-50 text-amber-700',
  compassionate: 'bg-gray-50 text-gray-700',
  unpaid: 'bg-orange-50 text-orange-700',
  adoption: 'bg-indigo-50 text-indigo-700',
  family: 'bg-teal-50 text-teal-700',
}

interface LeaveWithEmployee extends Leave {
  employee?: {
    employee_number: string
    job_title: string
    user?: { full_name: string; email: string }
  }
}

function RejectModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: (reason: string) => void
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Reject Leave Request</h3>
        <textarea
          className="input resize-none text-sm"
          rows={3}
          placeholder="Reason for rejection (optional)…"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button
            onClick={() => { onConfirm(reason); setReason('') }}
            className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

export function LeaveManagementClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [rejectTarget, setRejectTarget] = useState<string | null>(null)

  const { data, isLoading } = useLeaveRequests({
    companyId: activeCompanyId ?? undefined,
    status: statusFilter || undefined,
    leaveType: typeFilter || undefined,
  })
  const actOnLeave = useActOnLeave()

  const leaves = data?.data ?? []
  const pending = leaves.filter(l => l.status === 'pending').length
  const approved = leaves.filter(l => l.status === 'approved').length

  async function handleApprove(id: string) {
    try {
      await actOnLeave.mutateAsync({ id, action: 'approve' })
      toast.success('Leave approved')
    } catch {
      toast.error('Failed to approve leave')
    }
  }

  async function handleReject(id: string, reason: string) {
    try {
      await actOnLeave.mutateAsync({ id, action: 'reject', rejection_reason: reason || undefined })
      toast.success('Leave rejected')
    } catch {
      toast.error('Failed to reject leave')
    } finally {
      setRejectTarget(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Leave Management</h1>
          <p className="text-sm text-text-muted mt-0.5">{pending} pending approval</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pending', value: pending, icon: Clock, color: 'text-amber-600' },
          { label: 'Approved', value: approved, icon: CalendarCheck, color: 'text-green-600' },
          { label: 'Total Requests', value: leaves.length, icon: Users, color: 'text-text-primary' },
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

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <select
            className="input pl-9 pr-8 appearance-none cursor-pointer"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <select
            className="input pl-9 pr-8 appearance-none cursor-pointer"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All Types</option>
            {(Object.keys(LEAVE_TYPE_LABELS) as LeaveType[]).map(t => (
              <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Leave requests table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Leave Requests</h3>
        </div>

        {isLoading ? (
          <SkeletonTable rows={8} />
        ) : leaves.length === 0 ? (
          <LottieEmpty message="No leave requests found" description="Leave requests will appear here once submitted." />
        ) : (
          <div className="divide-y divide-border">
            {leaves.map((leave) => (
              <LeaveRow
                key={leave.id}
                leave={leave as LeaveWithEmployee}
                onApprove={() => handleApprove(leave.id)}
                onReject={() => setRejectTarget(leave.id)}
                isActing={actOnLeave.isPending}
              />
            ))}
          </div>
        )}
      </div>

      <RejectModal
        open={!!rejectTarget}
        onConfirm={(reason) => rejectTarget && handleReject(rejectTarget, reason)}
        onCancel={() => setRejectTarget(null)}
      />
    </div>
  )
}

function LeaveRow({
  leave,
  onApprove,
  onReject,
  isActing,
}: {
  leave: LeaveWithEmployee
  onApprove: () => void
  onReject: () => void
  isActing: boolean
}) {
  const typeColor = LEAVE_TYPE_COLORS[leave.leave_type] ?? 'bg-surface text-text-muted'
  const name = leave.employee?.user?.full_name ?? 'Unknown'
  const title = leave.employee?.job_title ?? ''

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Avatar name={name} size="sm" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-text-primary">{name}</p>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${typeColor}`}>
            {LEAVE_TYPE_LABELS[leave.leave_type as LeaveType] ?? leave.leave_type}
          </span>
        </div>
        <p className="text-xs text-text-muted mt-0.5">
          {title && <>{title} · </>}
          {formatDate(leave.start_date)} – {formatDate(leave.end_date)}
          {' · '}{leave.days_requested} day{leave.days_requested !== 1 ? 's' : ''}
        </p>
        {leave.reason && (
          <p className="text-xs text-text-muted mt-0.5 truncate max-w-xs italic">"{leave.reason}"</p>
        )}
        {leave.rejection_reason && leave.status === 'rejected' && (
          <p className="text-xs text-red-600 mt-0.5">↳ {leave.rejection_reason}</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <StatusBadge status={leave.status} />
        {leave.status === 'pending' && (
          <>
            <button
              onClick={onApprove}
              disabled={isActing}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Approve
            </button>
            <button
              onClick={onReject}
              disabled={isActing}
              className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  )
}
