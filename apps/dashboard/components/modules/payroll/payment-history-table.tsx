'use client'

import { useState, useMemo } from 'react'
import { Search, Banknote, Smartphone, FileText } from 'lucide-react'
import { formatKES, monthYearLabel } from '@hr/shared'
import { StatusBadge } from '@/components/ui/badge'
import { SkeletonTable } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { PaymentHistoryRecord } from '@/lib/hooks/use-payroll'

interface PaymentHistoryTableProps {
  records: PaymentHistoryRecord[]
  isLoading: boolean
}

const PAYMENT_METHOD_ICONS = {
  bank: Banknote,
  mpesa: Smartphone,
  airtel: Smartphone,
}

const PAYMENT_METHOD_COLORS = {
  bank: 'text-primary',
  mpesa: 'text-green-600',
  airtel: 'text-red-600',
}

export function PaymentHistoryTable({
  records,
  isLoading,
}: PaymentHistoryTableProps) {
  const [search, setSearch] = useState('')

  // Filter records by search
  const filteredRecords = useMemo(() => {
    if (!search) return records

    const searchLower = search.toLowerCase()
    return records.filter(
      (rec) =>
        rec.employee_name.toLowerCase().includes(searchLower) ||
        rec.department?.toLowerCase().includes(searchLower) ||
        rec.employee_number.toLowerCase().includes(searchLower) ||
        rec.reference?.toLowerCase().includes(searchLower)
    )
  }, [records, search])

  if (isLoading) {
    return <SkeletonTable rows={8} cols={7} />
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, department, or reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-alt border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Department
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Period
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Amount
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Method
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-text-muted">
                    <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No payment history found</p>
                    {search && (
                      <p className="text-xs mt-1">
                        Try adjusting your search
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => {
                  const MethodIcon = PAYMENT_METHOD_ICONS[rec.payment_method]
                  const methodColor = PAYMENT_METHOD_COLORS[rec.payment_method]

                  return (
                    <tr
                      key={rec.id}
                      className="hover:bg-surface-alt/50 transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-text-body">
                        {rec.payment_date
                          ? new Date(rec.payment_date).toLocaleDateString('en-KE', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-text-primary">
                            {rec.employee_name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {rec.employee_number}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-body">
                        {rec.department || (
                          <span className="text-text-muted italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-body">
                        {rec.period_month && rec.period_year
                          ? monthYearLabel(rec.period_month, rec.period_year)
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-text-primary">
                        {formatKES(rec.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <MethodIcon className={cn('w-4 h-4', methodColor)} />
                          <span className="text-xs capitalize">
                            {rec.payment_method === 'mpesa'
                              ? 'M-Pesa'
                              : rec.payment_method}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={rec.status} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer stats */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-alt border-t border-border text-xs text-text-muted">
          <span>Showing {filteredRecords.length} records</span>
          <span>
            Total: {formatKES(filteredRecords.reduce((sum, rec) => sum + rec.amount, 0))}
          </span>
        </div>
      </div>
    </div>
  )
}
