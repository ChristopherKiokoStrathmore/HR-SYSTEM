'use client'

import type { EmployeeWithUser } from '@hr/shared'
import { formatKES, formatDate, daysUntil } from '@hr/shared'
import { cn } from '@/lib/utils'

export function TabOverview({ employee }: { employee: EmployeeWithUser }) {
  const contractDaysLeft = employee.end_date ? daysUntil(employee.end_date) : null

  const contractColor =
    contractDaysLeft === null ? 'bg-success'
    : contractDaysLeft > 90 ? 'bg-success'
    : contractDaysLeft > 30 ? 'bg-warning'
    : 'bg-danger'

  const contractPct =
    contractDaysLeft === null ? 100
    : employee.contract_duration_months
    ? Math.max(0, 100 - (contractDaysLeft / (employee.contract_duration_months * 30)) * 100)
    : 100

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Personal info */}
      <div className="lg:col-span-2 space-y-4">
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['Date of Birth', employee.date_of_birth ? formatDate(employee.date_of_birth) : '—'],
              ['Gender', employee.gender ?? '—'],
              ['Nationality', employee.nationality ?? '—'],
              ['ID Number', employee.id_number ? '••••••••' : '—'],
              ['Phone', employee.user?.phone ?? '—'],
              ['Email', employee.user?.email ?? '—'],
              ['Next of Kin', employee.next_of_kin_name ?? '—'],
              ['NOK Phone', employee.next_of_kin_phone ?? '—'],
              ['Relationship', employee.next_of_kin_relationship ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-text-muted text-xs">{label}</p>
                <p className="text-text-primary font-medium mt-0.5">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-4">Statutory Numbers</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {[
              ['NSSF', employee.nssf_number ?? '—'],
              ['NHIF', employee.nhif_number ?? '—'],
              ['KRA PIN', employee.kra_pin ?? '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-text-muted text-xs">{label}</p>
                <p className="text-text-primary font-medium font-mono mt-0.5">
                  {value !== '—' ? '••••••••' : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right: Contract + Salary cards */}
      <div className="space-y-4">
        {/* Salary card */}
        <div className="card bg-primary text-white">
          <p className="text-white/60 text-xs mb-1">Gross Salary</p>
          <p className="text-2xl font-bold">{formatKES(employee.salary)}</p>
          <p className="text-white/60 text-xs mt-1 capitalize">
            {employee.payment_method} ·{' '}
            {employee.payment_method === 'bank'
              ? employee.bank_name ?? 'Bank'
              : employee.payment_method === 'mpesa'
              ? employee.mpesa_number ?? 'M-Pesa'
              : employee.airtel_number ?? 'Airtel'}
          </p>
        </div>

        {/* Contract timeline */}
        <div className="card">
          <h3 className="text-sm font-semibold text-text-primary mb-3">Contract</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted text-xs">Start</span>
              <span className="text-text-primary font-medium">{formatDate(employee.start_date)}</span>
            </div>
            {employee.end_date && (
              <div className="flex justify-between">
                <span className="text-text-muted text-xs">End</span>
                <span className="text-text-primary font-medium">{formatDate(employee.end_date)}</span>
              </div>
            )}
            {contractDaysLeft !== null && (
              <div className="flex justify-between">
                <span className="text-text-muted text-xs">Days Left</span>
                <span className={cn('font-bold text-sm',
                  contractDaysLeft > 90 ? 'text-success'
                  : contractDaysLeft > 30 ? 'text-warning'
                  : 'text-danger'
                )}>
                  {contractDaysLeft}
                </span>
              </div>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-3 h-2 bg-surface-alt rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', contractColor)}
              style={{ width: `${Math.min(100, contractPct)}%` }}
            />
          </div>
          {employee.contract_duration_months && (
            <p className="text-xs text-text-muted mt-1">
              {employee.contract_duration_months}-month contract
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
