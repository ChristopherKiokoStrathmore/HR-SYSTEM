'use client'

import Link from 'next/link'
import { FileSignature, CheckCircle2, Clock, Send, CreditCard, Loader2, ArrowRight } from 'lucide-react'
import { usePayrollRuns, type PayrollRun } from '@/lib/hooks/use-payroll'
import { formatKES } from '@hr/shared'

function monthLabel(m: number, y: number) {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return `${months[(m - 1) % 12] ?? m} ${y}`
}

// Map a run status to a human label + how the signing/disbursement stage reads.
function stageFor(status: string): { label: string; tone: string; icon: typeof Clock; cta: string } {
  switch (status) {
    case 'draft':
    case 'calculated':
      return { label: 'Ready to send for signing', tone: 'text-text-muted bg-surface-alt', icon: Send, cta: 'Send to employer' }
    case 'pending_approval':
    case 'in_review':
      return { label: 'Awaiting employer signature', tone: 'text-amber-700 bg-amber-50', icon: Clock, cta: 'View signing status' }
    case 'approved':
      return { label: 'Signed — ready to disburse', tone: 'text-green-700 bg-green-50', icon: CheckCircle2, cta: 'Release payment' }
    case 'processing':
      return { label: 'Disbursing…', tone: 'text-blue-700 bg-blue-50', icon: Loader2, cta: 'View progress' }
    case 'completed':
    case 'paid':
      return { label: 'Paid', tone: 'text-green-700 bg-green-50', icon: CheckCircle2, cta: 'View' }
    default:
      return { label: status, tone: 'text-text-muted bg-surface-alt', icon: Clock, cta: 'View' }
  }
}

export function PayrollApprovalsList({ companyId }: { companyId: string | null }) {
  const { data, isLoading } = usePayrollRuns(companyId)
  const runs: PayrollRun[] = data?.data ?? []

  if (isLoading) {
    return <div className="card p-6 text-center text-text-muted">Loading payroll runs…</div>
  }

  if (runs.length === 0) {
    return (
      <div className="card p-8 text-center">
        <FileSignature className="w-8 h-8 mx-auto mb-2 text-text-muted opacity-50" />
        <p className="text-sm font-medium text-text-primary">No payroll runs yet</p>
        <p className="text-xs text-text-muted mt-1">
          Select employees on the “Pay Employees” tab and send the payroll to the employer for signing.
          It will appear here for approval and disbursement.
        </p>
      </div>
    )
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface-alt">
        <p className="text-sm font-semibold text-text-primary">Payroll approvals &amp; disbursement</p>
        <p className="text-xs text-text-muted">
          Send each run to the employer to e-sign. Once signed, release the payment to the recipients.
        </p>
      </div>
      <div className="divide-y divide-border">
        {runs.map((run) => {
          const stage = stageFor(String(run.status))
          const StageIcon = stage.icon
          return (
            <div key={run.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">
                  {monthLabel(run.period_month, run.period_year)} Payroll
                </p>
                <p className="text-xs text-text-muted">
                  {run.employee_count ?? 0} employee{(run.employee_count ?? 0) !== 1 ? 's' : ''} · Net {formatKES(run.total_net ?? 0)}
                </p>
              </div>
              <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${stage.tone}`}>
                <StageIcon className={`w-3.5 h-3.5 ${run.status === 'processing' ? 'animate-spin' : ''}`} />
                <span>{stage.label}</span>
              </div>
              <Link
                href={`/payroll/${run.id}`}
                className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors flex items-center gap-1.5 flex-shrink-0"
              >
                {run.status === 'approved' ? <CreditCard className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                {stage.cta}
              </Link>
            </div>
          )
        })}
      </div>
    </div>
  )
}
