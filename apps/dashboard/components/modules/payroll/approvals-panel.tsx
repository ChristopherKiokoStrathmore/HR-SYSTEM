'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { ShieldCheck, Send, CheckCircle2, XCircle, FileText, Lock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Quorum approval panel for a payroll run (drop into the payroll detail page):
 *   <ApprovalsPanel runId={run.id} status={run.status} />
 *
 * Flow: submit → backend generates protected PDF + colored Excel, opens the
 * DocuSeal submission and notifies approvers (email + SMS one-tap). Approvals
 * accumulate until M-of-N quorum → status approved. After payment, mark-paid
 * locks every document.
 */

interface Approval {
  id: string
  approver_user_id: string
  decision: string
  via: string
  signed_at: string
}

interface PayrollDoc {
  id: string
  doc_type: string
  sha256: string
  password_protected: boolean
  is_locked: boolean
  download_url: string
}

export function ApprovalsPanel({ runId, status }: { runId: string; status: string }) {
  const qc = useQueryClient()

  const { data: approvals } = useQuery({
    queryKey: ['payroll-approvals', runId],
    queryFn: async () => {
      const res = await fetch(`/api/hr/payroll-approvals?payroll_run_id=${runId}`)
      if (!res.ok) return []
      const json = await res.json()
      return (json.results ?? json) as Approval[]
    },
  })

  const { data: docs } = useQuery({
    queryKey: ['payroll-documents', runId],
    queryFn: async () => {
      const res = await fetch(`/api/hr/payroll-documents?payroll_run_id=${runId}`)
      if (!res.ok) return []
      const json = await res.json()
      return (json.results ?? json) as PayrollDoc[]
    },
  })

  const workflow = useMutation({
    mutationFn: async (verb: 'submit' | 'approve' | 'reject' | 'mark-paid') => {
      const res = await fetch(`/api/hr/payroll-workflow/${runId}/${verb}`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? `${verb} failed`)
      return json
    },
    onSuccess: (data, verb) => {
      qc.invalidateQueries({ queryKey: ['payroll-approvals', runId] })
      qc.invalidateQueries({ queryKey: ['payroll-documents', runId] })
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
      if (verb === 'submit') {
        toast.success(`Submitted — ${data.approvers_notified} approver(s) notified` +
          (data.minimum_wage_alerts ? ` · ⚠️ ${data.minimum_wage_alerts} minimum-wage alert(s)` : ''))
      } else {
        toast.success(`Payroll ${verb.replace('-', ' ')} recorded`)
      }
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const approvedCount = (approvals ?? []).filter(a => a.decision === 'approved').length

  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Approval Workflow
        </h3>
        <span className={cn('text-xs px-2 py-0.5 rounded-full border',
          status === 'approved' || status === 'paid' || status === 'completed'
            ? 'bg-green-50 text-green-700 border-green-200'
            : status === 'pending_approval'
            ? 'bg-amber-50 text-amber-700 border-amber-200'
            : 'bg-gray-50 text-gray-600 border-gray-200')}>
          {status.replace('_', ' ')}
        </span>
      </div>

      {(approvals ?? []).length > 0 && (
        <div className="space-y-1.5">
          {(approvals ?? []).map(a => (
            <div key={a.id} className="flex items-center gap-2 text-xs text-text-body">
              {a.decision === 'approved'
                ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                : <XCircle className="w-3.5 h-3.5 text-red-600" />}
              {a.approver_user_id.slice(0, 8)}… {a.decision} via {a.via} · {new Date(a.signed_at).toLocaleString()}
            </div>
          ))}
          <p className="text-xs text-text-muted">{approvedCount} approval(s) recorded</p>
        </div>
      )}

      {(docs ?? []).length > 0 && (
        <div className="space-y-1.5">
          {(docs ?? []).map(d => (
            <a key={d.id} href={`/api/hr/${d.download_url.replace(/^\/api\//, '')}`}
               className="flex items-center gap-2 text-xs text-primary hover:underline">
              {d.is_locked ? <Lock className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
              {d.doc_type.replace('_', ' ')} {d.password_protected && '(password protected)'}
              <span className="text-text-muted">sha256 {d.sha256.slice(0, 10)}…</span>
            </a>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(status === 'draft' || status === 'calculated') && (
          <button onClick={() => workflow.mutate('submit')} disabled={workflow.isPending}
                  className="btn-primary flex items-center gap-2 text-sm">
            {workflow.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Submit for Approval
          </button>
        )}
        {status === 'pending_approval' && (
          <>
            <button onClick={() => workflow.mutate('approve')} disabled={workflow.isPending}
                    className="btn-primary flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" /> Approve (sign)
            </button>
            <button onClick={() => workflow.mutate('reject')} disabled={workflow.isPending}
                    className="btn-ghost flex items-center gap-2 text-sm border border-border">
              <XCircle className="w-4 h-4" /> Reject
            </button>
          </>
        )}
        {(status === 'approved' || status === 'processing' || status === 'completed') && (
          <button onClick={() => workflow.mutate('mark-paid')} disabled={workflow.isPending}
                  className="btn-primary flex items-center gap-2 text-sm">
            <Lock className="w-4 h-4" /> Mark Paid &amp; Lock Documents
          </button>
        )}
      </div>
    </div>
  )
}
