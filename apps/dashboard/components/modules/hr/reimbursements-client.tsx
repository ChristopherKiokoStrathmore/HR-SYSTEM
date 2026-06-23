'use client'

import { useState } from 'react'
import { useReimbursements, useProcessReimbursement } from '@/lib/hooks/use-reimbursements'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { SkeletonTable } from '@/components/ui/skeleton'
import { LottieEmpty } from '@/components/ui/lottie-empty'
import { toast } from '@/lib/toast'
import { formatKES } from '@hr/shared'
import {
  CheckCircle, XCircle, CreditCard, Filter, ChevronDown,
  Clock, DollarSign, Receipt, ExternalLink,
} from 'lucide-react'

function MarkPaidModal({
  open,
  onConfirm,
  onCancel,
}: {
  open: boolean
  onConfirm: (ref: string) => void
  onCancel: () => void
}) {
  const [ref, setRef] = useState('')
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-sm font-semibold text-text-primary">Mark as Paid</h3>
        <input
          className="input text-sm"
          placeholder="Payment reference (optional)…"
          value={ref}
          onChange={e => setRef(e.target.value)}
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="btn-ghost flex-1 text-sm">Cancel</button>
          <button
            onClick={() => { onConfirm(ref); setRef('') }}
            className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
          >
            Confirm Paid
          </button>
        </div>
      </div>
    </div>
  )
}

export function ReimbursementsClient() {
  const [statusFilter, setStatusFilter] = useState('')
  const [paidTarget, setPaidTarget] = useState<string | null>(null)
  const { data, isLoading } = useReimbursements(statusFilter || undefined)
  const process = useProcessReimbursement()

  const items = Array.isArray(data) ? data : []
  const pending = items.filter(r => r.status === 'submitted').length
  const totalAmount = items.reduce((s, r) => s + Number(r.amount), 0)

  async function handleDecision(id: string, decision: 'approved' | 'rejected') {
    try {
      await process.mutateAsync({ id, decision })
      toast.success(`Reimbursement ${decision}`)
    } catch {
      toast.error(`Failed to ${decision} reimbursement`)
    }
  }

  async function handlePaid(id: string, ref: string) {
    try {
      await process.mutateAsync({ id, decision: 'paid', payment_reference: ref })
      toast.success('Marked as paid')
    } catch {
      toast.error('Failed to mark as paid')
    } finally {
      setPaidTarget(null)
    }
  }

  const STATUS_COLORS: Record<string, string> = {
    submitted: 'text-amber-600',
    approved: 'text-blue-600',
    paid: 'text-green-600',
    rejected: 'text-red-600',
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Reimbursements</h1>
        <p className="text-sm text-text-muted mt-0.5">{pending} awaiting review</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Submitted', value: pending, icon: Clock, color: 'text-amber-600' },
          { label: 'Total Value', value: formatKES(totalAmount), icon: DollarSign, color: 'text-text-primary' },
          { label: 'All Requests', value: items.length, icon: Receipt, color: 'text-text-muted' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-xl font-bold ${color}`}>{value}</p>
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
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Reimbursement Requests</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : items.length === 0 ? (
          <LottieEmpty message="No reimbursements" description="Employee reimbursement requests will appear here." />
        ) : (
          <div className="divide-y divide-border">
            {items.map(item => {
              const name = item.employee_name ?? `Employee ${String(item.employee_id).slice(0, 8)}`
              return (
                <div key={item.id} className="flex items-center gap-4 px-4 py-3">
                  <Avatar name={name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-text-primary">{name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-surface-alt text-text-muted font-medium border border-border">
                        {item.category}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      <span className={`font-semibold ${STATUS_COLORS[item.status] ?? ''}`}>
                        {formatKES(Number(item.amount))}
                      </span>
                      {item.description && <> · <span className="italic">"{item.description}"</span></>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {item.receipt_url && (
                      <a
                        href={item.receipt_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-text-muted hover:text-primary transition-colors flex items-center gap-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" /> Receipt
                      </a>
                    )}
                    <StatusBadge status={item.status} />
                    {item.status === 'submitted' && (
                      <>
                        <button
                          onClick={() => handleDecision(item.id, 'approved')}
                          disabled={process.isPending}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50"
                        >
                          <CheckCircle className="w-3.5 h-3.5" /> Approve
                        </button>
                        <button
                          onClick={() => handleDecision(item.id, 'rejected')}
                          disabled={process.isPending}
                          className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 transition-colors disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </>
                    )}
                    {item.status === 'approved' && (
                      <button
                        onClick={() => setPaidTarget(item.id)}
                        disabled={process.isPending}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        <CreditCard className="w-3.5 h-3.5" /> Mark Paid
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <MarkPaidModal
        open={!!paidTarget}
        onConfirm={ref => paidTarget && handlePaid(paidTarget, ref)}
        onCancel={() => setPaidTarget(null)}
      />
    </div>
  )
}
