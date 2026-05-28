'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePayrollRun, useDisbursePayroll, type PayrollRecordWithEmployee } from '@/lib/hooks/use-payroll'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/badge'
import { SkeletonTable } from '@/components/ui/skeleton'
import { formatKES, monthYearLabel } from '@hr/shared'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  CreditCard,
  CheckCircle,
  Square,
  CheckSquare,
  Loader2,
  Users,
  DollarSign,
  Banknote,
  Smartphone,
} from 'lucide-react'

function DisburseSelectedModal({
  open,
  selectedCount,
  totalAmount,
  onClose,
  onDisburse,
  isPending,
}: {
  open: boolean
  selectedCount: number
  totalAmount: number
  onClose: () => void
  onDisburse: (method: 'all' | 'bank' | 'mpesa' | 'airtel') => void
  isPending: boolean
}) {
  const [method, setMethod] = useState<'all' | 'bank' | 'mpesa' | 'airtel'>('all')

  return (
    <Modal open={open} onClose={onClose} title="Disburse Selected Employees" size="sm">
      <div className="space-y-4">
        <div className="card bg-surface p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Selected Employees</span>
            <span className="font-medium">{selectedCount}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Total Amount</span>
            <span className="font-bold text-text-primary">{formatKES(totalAmount)}</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Payment Method Filter</label>
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
              ? "Process all selected using each employee's preferred method"
              : `Only process selected employees with ${method.toUpperCase()} payment method`}
          </p>
        </div>

        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-xs text-blue-800">
          Payments will be processed via IntaSend (M-Pesa) and PesaPal (Airtel Money, Bank EFT).
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            onClick={() => onDisburse(method)}
            disabled={isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? 'Processing...' : 'Disburse'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

const PAYMENT_METHOD_ICONS: Record<string, typeof Banknote> = {
  bank: Banknote,
  mpesa: Smartphone,
  airtel: Smartphone,
}

const PAYMENT_METHOD_COLORS: Record<string, string> = {
  bank: 'text-primary',
  mpesa: 'text-green-600',
  airtel: 'text-red-600',
}

export function PayrollRunDetailClient({ runId }: { runId: string }) {
  const { data, isLoading } = usePayrollRun(runId)
  const disburse = useDisbursePayroll()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [disburseModal, setDisburseModal] = useState(false)

  const run = data?.data
  const records = run?.records ?? []
  const pendingRecords = records.filter(r => r.payment_status === 'pending')

  // Calculate totals for selected
  const selectedRecords = records.filter(r => selectedIds.has(r.id))
  const selectedTotal = selectedRecords.reduce((sum, r) => sum + r.net_salary, 0)

  function toggleRecord(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectAllPending() {
    setSelectedIds(new Set(pendingRecords.map(r => r.id)))
  }

  function clearSelection() {
    setSelectedIds(new Set())
  }

  async function handleDisburse(method: 'all' | 'bank' | 'mpesa' | 'airtel') {
    try {
      const recordIds = Array.from(selectedIds)
      const res = await disburse.mutateAsync({ runId, method, recordIds })
      if (res.success) {
        toast.success(`Disbursed ${res.totalProcessed} payments — Ref: ${res.reference}`)
      } else {
        toast.error('Some payments failed')
      }
      setDisburseModal(false)
      setSelectedIds(new Set())
    } catch (e) {
      toast.error('Disbursement failed', String(e))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="skeleton h-8 w-32 rounded-lg" />
        <div className="skeleton h-24 rounded-xl" />
        <SkeletonTable rows={5} />
      </div>
    )
  }

  if (!run) {
    return (
      <div className="card text-center py-12">
        <p className="text-text-muted">Payroll run not found</p>
        <Link href="/payroll" className="text-accent hover:underline text-sm mt-2 block">
          Back to Payroll
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link href="/payroll" className="flex items-center gap-2 text-sm text-text-muted hover:text-text-primary transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Payroll
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            {monthYearLabel(run.period_month, run.period_year)}
          </h1>
          <p className="text-sm text-text-muted mt-0.5">{records.length} employee{records.length !== 1 ? 's' : ''}</p>
        </div>
        <StatusBadge status={run.status} />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-text-primary">{records.length}</p>
            <p className="text-xs text-text-muted">Employees</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-green-600">{formatKES(run.total_gross)}</p>
            <p className="text-xs text-text-muted">Gross</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-xl font-bold text-red-600">{formatKES(run.total_deductions)}</p>
            <p className="text-xs text-text-muted">Deductions</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
            <CreditCard className="w-5 h-5 text-primary" />
          </div>
          <div>
            <p className="text-xl font-bold text-primary">{formatKES(run.total_net)}</p>
            <p className="text-xs text-text-muted">Net Payable</p>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 bg-accent/10 border border-accent/20 rounded-xl">
          <span className="text-sm font-medium text-accent">
            {selectedIds.size} selected ({formatKES(selectedTotal)})
          </span>
          <div className="flex-1" />
          <button onClick={clearSelection} className="text-xs text-text-muted hover:text-text-primary">
            Clear selection
          </button>
          <button
            onClick={() => setDisburseModal(true)}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            Disburse Selected
          </button>
        </div>
      )}

      {/* Employee records table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Employee Records</h3>
          {pendingRecords.length > 0 && (
            <button
              onClick={selectAllPending}
              className="text-xs text-accent hover:underline"
            >
              Select all pending ({pendingRecords.length})
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 text-left w-10"></th>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Emp #</th>
                <th className="px-4 py-3 text-right">Gross</th>
                <th className="px-4 py-3 text-right">Deductions</th>
                <th className="px-4 py-3 text-right">Net</th>
                <th className="px-4 py-3 text-center">Method</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.map((record) => {
                const isSelected = selectedIds.has(record.id)
                const isPending = record.payment_status === 'pending'
                const MethodIcon = PAYMENT_METHOD_ICONS[record.payment_method] ?? Banknote

                return (
                  <tr
                    key={record.id}
                    className={cn(
                      'hover:bg-surface-alt/50 transition-colors',
                      isSelected && 'bg-accent/5'
                    )}
                  >
                    <td className="px-4 py-3">
                      {isPending ? (
                        <button
                          onClick={() => toggleRecord(record.id)}
                          className="text-text-muted hover:text-accent transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-5 h-5 text-accent" />
                          ) : (
                            <Square className="w-5 h-5" />
                          )}
                        </button>
                      ) : (
                        <span className="w-5 h-5 block" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-text-primary">{record.employee_name}</p>
                        <p className="text-xs text-text-muted">{record.employee_number}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-text-muted font-mono text-xs">
                      {record.employee_number}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">
                      {formatKES(record.gross_salary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-600">
                      {formatKES(record.paye + record.nssf + record.nhif + record.helb + record.other_deductions)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium">
                      {formatKES(record.net_salary)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <MethodIcon className={cn('w-4 h-4', PAYMENT_METHOD_COLORS[record.payment_method])} />
                        <span className="text-xs capitalize">{record.payment_method === 'mpesa' ? 'M-Pesa' : record.payment_method}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <StatusBadge status={record.payment_status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {records.length === 0 && (
          <div className="text-center py-12 text-text-muted text-sm">
            No payroll records found. Click "Calculate" on the payroll run to generate records.
          </div>
        )}
      </div>

      <DisburseSelectedModal
        open={disburseModal}
        selectedCount={selectedIds.size}
        totalAmount={selectedTotal}
        onClose={() => setDisburseModal(false)}
        onDisburse={handleDisburse}
        isPending={disburse.isPending}
      />
    </div>
  )
}
