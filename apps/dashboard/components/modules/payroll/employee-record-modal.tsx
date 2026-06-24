'use client'

import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/badge'
import { formatKES, monthYearLabel } from '@hr/shared'
import { Send, Loader2, Briefcase, Building2, CreditCard, Clock } from 'lucide-react'
import type { EmployeeSalaryRow, PaymentHistoryRecord } from '@/lib/hooks/use-payroll'

interface EmployeeRecordModalProps {
  employee: EmployeeSalaryRow | null
  history: PaymentHistoryRecord[]
  open: boolean
  onClose: () => void
  onSendForApproval: (employee: EmployeeSalaryRow) => void
  isSending?: boolean
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-text-muted">{label}</span>
      <span className={strong ? 'font-semibold text-text-primary' : 'font-mono text-text-body'}>
        {value}
      </span>
    </div>
  )
}

export function EmployeeRecordModal({
  employee,
  history,
  open,
  onClose,
  onSendForApproval,
  isSending,
}: EmployeeRecordModalProps) {
  if (!employee) return null

  const gross = employee.gross_salary ?? employee.salary
  const net = employee.net_salary ?? employee.salary
  const paye = employee.paye ?? 0
  const sha = employee.nhif ?? 0
  const housingLevy = employee.helb ?? 0
  const nssf = employee.nssf ?? 0
  const other = employee.other_deductions ?? 0
  const totalDed =
    employee.total_deductions ?? paye + sha + housingLevy + nssf + other

  // Historical paid wages for this employee, most recent first.
  const empHistory = history
    .filter((h) => h.employee_id === employee.employee_id)
    .sort((a, b) => (a.payment_date < b.payment_date ? 1 : -1))

  return (
    <Modal open={open} onClose={onClose} title={employee.employee_name} size="lg">
      <div className="space-y-5">
        {/* 1. Employee summary */}
        <section>
          <h3 className="text-xs uppercase tracking-wide text-text-muted mb-2">Employee</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-text-muted" />
              <span className="text-text-body">{employee.employee_number || '—'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-text-muted" />
              <span className="text-text-body">{employee.department || 'Unassigned'}</span>
            </div>
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-text-muted" />
              <span className="text-text-body capitalize">
                {employee.payment_method === 'mpesa' ? 'M-Pesa' : employee.payment_method}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={employee.payment_status} />
            </div>
          </div>
        </section>

        {/* 2. Salary breakdown */}
        <section className="card bg-surface-alt p-4">
          <h3 className="text-xs uppercase tracking-wide text-text-muted mb-1">Salary</h3>
          <Row label="Gross salary" value={formatKES(gross)} />
          <Row label="Total deductions" value={formatKES(totalDed)} />
          <div className="border-t border-border mt-1 pt-1">
            <Row label="Net salary" value={formatKES(net)} strong />
          </div>
        </section>

        {/* 3. Deductions breakdown */}
        <section className="card p-4">
          <h3 className="text-xs uppercase tracking-wide text-text-muted mb-1">Deductions</h3>
          <Row label="PAYE" value={formatKES(paye)} />
          <Row label="SHA" value={formatKES(sha)} />
          <Row label="Housing Levy" value={formatKES(housingLevy)} />
          <Row label="NSSF" value={formatKES(nssf)} />
          <Row label="Loans / SACCO / Other" value={formatKES(other)} />
          <div className="border-t border-border mt-1 pt-1">
            <Row label="Total deductions" value={formatKES(totalDed)} strong />
          </div>
        </section>

        {/* 4. Historical paid wages */}
        <section>
          <h3 className="text-xs uppercase tracking-wide text-text-muted mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Payment History
          </h3>
          {empHistory.length === 0 ? (
            <p className="text-sm text-text-muted py-3 text-center border border-dashed border-border rounded-lg">
              No past payments recorded for this employee yet.
            </p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-surface-alt text-text-muted text-xs uppercase tracking-wide">
                  <tr>
                    <th className="px-3 py-2 text-left">Period</th>
                    <th className="px-3 py-2 text-right">Net Paid</th>
                    <th className="px-3 py-2 text-center">Method</th>
                    <th className="px-3 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {empHistory.map((h) => (
                    <tr key={h.id}>
                      <td className="px-3 py-2">{monthYearLabel(h.period_month, h.period_year)}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatKES(h.amount)}</td>
                      <td className="px-3 py-2 text-center capitalize">
                        {h.payment_method === 'mpesa' ? 'M-Pesa' : h.payment_method}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <StatusBadge status={h.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* 5. Single-employee approval action */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">
            Close
          </button>
          <button
            onClick={() => onSendForApproval(employee)}
            disabled={isSending || employee.payment_status !== 'pending'}
            title={
              employee.payment_status !== 'pending'
                ? 'Only pending employees can be sent for approval'
                : undefined
            }
            className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send for Approval
          </button>
        </div>
      </div>
    </Modal>
  )
}
