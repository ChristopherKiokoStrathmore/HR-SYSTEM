'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  usePayrollRuns, useCreatePayrollRun,
  useProcessPayrollRun, useDisbursePayroll,
} from '@/lib/hooks/use-payroll'
import { useCompany } from '@/lib/hooks/use-companies'
import { StatusBadge } from '@/components/ui/badge'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { formatKES, monthYearLabel } from '@hr/shared'
import type { PayrollRun } from '@hr/shared'
import { useStore } from '@/lib/store'
import {
  Plus, Play, CreditCard, CheckCircle,
  DollarSign, Users, TrendingUp, Loader2, ChevronRight,
  Settings, AlertCircle, ArrowRight, Banknote, Smartphone,
  HelpCircle, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
]

function NewRunModal({
  open, companyId, onClose,
}: {
  open: boolean; companyId: string; onClose: () => void
}) {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const create = useCreatePayrollRun()

  async function handleCreate() {
    if (!companyId) {
      toast.error('No company selected', 'Please select a company first')
      onClose()
      return
    }
    try {
      await create.mutateAsync({ company_id: companyId, period_month: month, period_year: year })
      toast.success('Payroll run created')
      onClose()
    } catch (e) {
      toast.error('Failed to create run', String(e))
      onClose()
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Payroll Run" size="sm">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Month</label>
          <select className="input" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Year</label>
          <input
            type="number" className="input"
            value={year} min={2020} max={2030}
            onChange={e => setYear(Number(e.target.value))}
          />
        </div>
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={handleCreate}
            disabled={create.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Run
          </button>
        </div>
      </div>
    </Modal>
  )
}

function DisburseModal({
  open, run, onClose,
}: {
  open: boolean; run: PayrollRun | null; onClose: () => void
}) {
  const [method, setMethod] = useState<'mpesa' | 'bank' | 'airtel' | 'all'>('all')
  const [result, setResult] = useState<{
    success: boolean
    batches: Array<{ method: string; success: boolean; processed?: number; error?: string }>
    totalProcessed: number
    demo: boolean
    reference: string
  } | null>(null)
  const disburse = useDisbursePayroll()

  if (!run) return null

  async function handleDisburse() {
    try {
      const res = await disburse.mutateAsync({ runId: run!.id, method })
      setResult(res)
      if (res.success) {
        toast.success(`Disbursed ${res.totalProcessed} payments — Ref: ${res.reference}`)
      } else {
        toast.error('Some payments failed')
      }
    } catch (e) {
      toast.error('Disbursement failed', String(e))
    }
  }

  function handleClose() {
    setResult(null)
    onClose()
  }

  // Show results if we have them
  if (result) {
    return (
      <Modal open={open} onClose={handleClose} title="Disbursement Results" size="sm">
        <div className="space-y-4">
          <div className={cn(
            'rounded-lg px-4 py-3 text-sm',
            result.success ? 'bg-green-50 text-green-800' : 'bg-amber-50 text-amber-800'
          )}>
            {result.success
              ? `Successfully processed ${result.totalProcessed} payment${result.totalProcessed !== 1 ? 's' : ''}`
              : 'Some payments encountered errors'
            }
          </div>

          {result.demo && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
              Demo mode - no real payments were processed.
            </div>
          )}

          <div className="space-y-2">
            <p className="text-sm font-medium text-text-body">Batch Results:</p>
            {result.batches.map((batch, i) => (
              <div key={i} className="flex items-center justify-between text-sm p-2 rounded bg-surface-alt">
                <span className="capitalize">{batch.method === 'mpesa' ? 'M-Pesa' : batch.method === 'airtel' ? 'Airtel' : 'Bank EFT'}</span>
                {batch.success ? (
                  <span className="text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-4 h-4" />
                    {batch.processed} processed
                  </span>
                ) : (
                  <span className="text-red-600 text-xs">{batch.error || 'Failed'}</span>
                )}
              </div>
            ))}
          </div>

          <div className="text-xs text-text-muted">
            Reference: {result.reference}
          </div>

          <button onClick={handleClose} className="btn-primary w-full">
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title="Disburse Payroll" size="sm">
      <div className="space-y-4">
        <div className="card bg-surface p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Period</span>
            <span className="font-medium">{monthYearLabel(run.period_month, run.period_year)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Total Net</span>
            <span className="font-bold text-text-primary">{formatKES(run.total_net)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Total Gross</span>
            <span className="font-medium">{formatKES(run.total_gross)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Deductions</span>
            <span className="font-medium text-red-600">{formatKES(run.total_deductions)}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Payment Method</label>
          <div className="grid grid-cols-2 gap-2">
            {(['all', 'bank', 'mpesa', 'airtel'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={cn(
                  'py-2 rounded-lg border text-sm font-medium transition-colors capitalize',
                  method === m
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-accent/50'
                )}
              >
                {m === 'all' ? 'All Methods' : m === 'mpesa' ? 'M-Pesa' : m === 'airtel' ? 'Airtel' : 'Bank EFT'}
              </button>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-1">
            {method === 'all'
              ? 'Process all payments using each employee\'s preferred method'
              : `Only process ${method.toUpperCase()} payments`
            }
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
          Payments will be processed via PesaPal (M-Pesa, Airtel Money, Bank EFT).
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={handleClose} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={handleDisburse}
            disabled={disburse.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {disburse.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {disburse.isPending ? 'Processing...' : 'Disburse'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ─── Payment Configuration Banner ─────────────────────────────────────────────

function PaymentConfigBanner({ companyId }: { companyId: string | null }) {
  const { data } = useCompany(companyId)
  const company = data?.data

  if (!company) return null

  const hasBank = !!(company.company_bank_name && company.company_bank_account)
  const hasMpesa = !!(company.mpesa_paybill_number || company.mpesa_till_number)
  const hasAirtel = !!company.airtel_business_number
  const hasPesapal = !!(company.pesapal_consumer_key && company.pesapal_consumer_secret)
  const isConfigured = company.payment_accounts_configured

  if (isConfigured && hasPesapal) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="text-sm font-medium text-green-800">Payment accounts configured</p>
            <p className="text-xs text-green-700 mt-0.5">
              {[
                hasBank && 'Bank EFT',
                hasMpesa && 'M-Pesa',
                hasAirtel && 'Airtel Money',
              ].filter(Boolean).join(' • ')}
            </p>
          </div>
        </div>
        <Link href="/settings" className="text-xs text-green-700 hover:text-green-900 flex items-center gap-1">
          <Settings className="w-3.5 h-3.5" />
          Manage
        </Link>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600" />
        <div>
          <p className="text-sm font-medium text-amber-800">Configure payment accounts to disburse salaries</p>
          <p className="text-xs text-amber-700 mt-0.5">
            Set up your company bank account, M-Pesa, or Airtel Money in Settings
          </p>
        </div>
      </div>
      <Link
        href="/settings"
        className="btn-primary text-xs flex items-center gap-1.5 py-1.5 px-3"
      >
        <Settings className="w-3.5 h-3.5" />
        Configure Now
      </Link>
    </div>
  )
}

// ─── Payroll Workflow Guide ───────────────────────────────────────────────────

function PayrollWorkflowGuide({ onClose }: { onClose: () => void }) {
  return (
    <div className="card border-2 border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-accent" />
          <h3 className="font-semibold text-text-primary">How Payroll Works</h3>
        </div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary text-sm">
          Dismiss
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          {
            step: 1,
            icon: Plus,
            title: 'Create Run',
            desc: 'Start a new payroll run for a specific month',
          },
          {
            step: 2,
            icon: Play,
            title: 'Calculate',
            desc: 'Auto-calculate salaries, taxes & deductions',
          },
          {
            step: 3,
            icon: FileText,
            title: 'Review',
            desc: 'Click the run to review individual payslips',
          },
          {
            step: 4,
            icon: CreditCard,
            title: 'Disburse',
            desc: 'Pay all or select specific employees',
          },
        ].map(({ step, icon: Icon, title, desc }, i) => (
          <div key={step} className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
              <span className="text-sm font-bold text-accent">{step}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Icon className="w-4 h-4 text-accent" />
                <p className="text-sm font-medium text-text-primary">{title}</p>
              </div>
              <p className="text-xs text-text-muted mt-0.5">{desc}</p>
            </div>
            {i < 3 && (
              <ArrowRight className="w-4 h-4 text-border hidden md:block mt-1" />
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center gap-4 text-xs text-text-muted">
        <div className="flex items-center gap-1.5">
          <Banknote className="w-4 h-4" />
          <span>Bank EFT</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-green-600" />
          <span>M-Pesa</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Smartphone className="w-4 h-4 text-red-600" />
          <span>Airtel Money</span>
        </div>
        <span className="ml-auto">Payments via PesaPal</span>
      </div>
    </div>
  )
}

// ─── Main Payroll Client ──────────────────────────────────────────────────────

export function PayrollClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [newRunModal, setNewRunModal] = useState(false)
  const [disburseRun, setDisburseRun] = useState<PayrollRun | null>(null)
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('payroll-guide-dismissed') !== 'true'
  })

  const { data, isLoading } = usePayrollRuns(activeCompanyId)
  const processRun = useProcessPayrollRun()

  const runs = data?.data ?? []
  const totalPaid = runs.filter(r => r.status === 'completed').reduce((s, r) => s + r.total_net, 0)

  function dismissGuide() {
    setShowGuide(false)
    localStorage.setItem('payroll-guide-dismissed', 'true')
  }

  async function handleProcess(runId: string) {
    try {
      const res = await processRun.mutateAsync(runId)
      toast.success(`Calculated ${res.recordCount} payslips`)
    } catch (e) {
      toast.error('Processing failed', String(e))
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment Configuration Status */}
      <PaymentConfigBanner companyId={activeCompanyId} />

      {/* Workflow Guide (dismissible) */}
      {showGuide && <PayrollWorkflowGuide onClose={dismissGuide} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Payroll</h1>
          <p className="text-sm text-text-muted mt-0.5">{runs.length} run{runs.length !== 1 ? 's' : ''} total</p>
        </div>
        <div className="flex items-center gap-3">
          {!showGuide && (
            <button
              onClick={() => setShowGuide(true)}
              className="btn-ghost text-sm flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              How it works
            </button>
          )}
          <button
            onClick={() => {
              if (!activeCompanyId) {
                toast.error('Please select a company first', 'Use the company switcher in the header to select a company')
                return
              }
              setNewRunModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Run
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Completed Runs', value: runs.filter(r => r.status === 'completed').length, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Total Disbursed', value: formatKES(totalPaid), icon: DollarSign, color: 'text-primary' },
          { label: 'Pending Runs', value: runs.filter(r => r.status !== 'completed').length, icon: TrendingUp, color: 'text-amber-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className={cn('text-xl font-bold', color)}>{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Runs table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Payroll Runs</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : runs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <CreditCard className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No payroll runs yet.</p>
            <button
              onClick={() => {
                if (!activeCompanyId) {
                  toast.error('Please select a company first', 'Use the company switcher in the header to select a company')
                  return
                }
                setNewRunModal(true)
              }}
              className="btn-primary"
            >
              Create first run
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {runs.map((run) => (
              <PayrollRunRow
                key={run.id}
                run={run}
                onProcess={() => handleProcess(run.id)}
                onDisburse={() => setDisburseRun(run)}
                processing={processRun.isPending && processRun.variables === run.id}
              />
            ))}
          </div>
        )}
      </div>

      <NewRunModal
        open={newRunModal}
        companyId={activeCompanyId ?? ''}
        onClose={() => setNewRunModal(false)}
      />
      <DisburseModal
        open={!!disburseRun}
        run={disburseRun}
        onClose={() => setDisburseRun(null)}
      />
    </div>
  )
}

function PayrollRunRow({
  run, onProcess, onDisburse, processing,
}: {
  run: PayrollRun
  onProcess: () => void
  onDisburse: () => void
  processing: boolean
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-surface-alt/50 transition-colors group">
      <Link href={`/payroll/${run.id}`} className="flex-1 min-w-0 flex items-center gap-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-text-primary group-hover:text-accent transition-colors">
            {monthYearLabel(run.period_month, run.period_year)}
          </p>
          {run.total_gross > 0 && (
            <p className="text-xs text-text-muted mt-0.5">
              Gross {formatKES(run.total_gross)} · Net {formatKES(run.total_net)} · Deductions {formatKES(run.total_deductions)}
            </p>
          )}
        </div>
        <ChevronRight className="w-4 h-4 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
      </Link>
      <StatusBadge status={run.status} />
      <div className="flex gap-2 flex-shrink-0">
        {run.status === 'draft' && (
          <button
            onClick={(e) => { e.stopPropagation(); onProcess() }}
            disabled={processing}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {processing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
            Calculate
          </button>
        )}
        {run.status === 'processing' && (
          <button
            onClick={(e) => { e.stopPropagation(); onDisburse() }}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent/90 transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Disburse
          </button>
        )}
        {run.status === 'completed' && (
          <span className="flex items-center gap-1 text-xs text-green-600">
            <CheckCircle className="w-3.5 h-3.5" />
            Paid {run.completed_at ? new Date(run.completed_at).toLocaleDateString('en-KE') : ''}
          </span>
        )}
      </div>
    </div>
  )
}
