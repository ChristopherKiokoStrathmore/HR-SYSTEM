'use client'

import { useQuery } from '@tanstack/react-query'
import { SkeletonTable } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/badge'
import { formatKES, monthYearLabel } from '@hr/shared'
import type { PayrollRecord } from '@hr/shared'

export function TabPayroll({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['payroll-records', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/payroll/records?employeeId=${employeeId}`)
      return res.json() as Promise<{ data: (PayrollRecord & { payroll_run: { period_month: number; period_year: number } })[] }>
    },
  })

  const records = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Payslip History</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : records.length === 0 ? (
          <p className="text-text-muted text-sm p-6 text-center">No payroll records found.</p>
        ) : (
          <div className="divide-y divide-border">
            {records.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">
                    {monthYearLabel(rec.payroll_run.period_month, rec.payroll_run.period_year)}
                  </p>
                  <p className="text-xs text-text-muted">
                    Gross {formatKES(rec.gross_salary)} · Tax {formatKES(rec.paye)}
                    · NSSF {formatKES(rec.nssf)} · NHIF {formatKES(rec.nhif)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-text-primary">{formatKES(rec.net_salary)}</span>
                  <StatusBadge status={rec.payment_status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
