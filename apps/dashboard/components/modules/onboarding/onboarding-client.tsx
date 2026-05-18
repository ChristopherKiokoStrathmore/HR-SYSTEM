'use client'

import { useQuery } from '@tanstack/react-query'
import { Avatar } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/badge'
import { SkeletonCard } from '@/components/ui/skeleton'
import { useStore } from '@/lib/store'
import { formatDate } from '@hr/shared'
import { UserPlus, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface OnboardingEmployee {
  id: string
  employee_number: string
  job_title: string
  department: string | null
  start_date: string
  employment_status: string
  user: { full_name: string; email: string; avatar_url: string | null }
  company: { name: string }
  doc_verified: number
  doc_uploaded: number
  doc_required: number
  doc_pct: number
}

const CHECKLIST_ITEMS = [
  { label: 'Contract Signed', check: (e: OnboardingEmployee) => e.doc_pct >= 17 }, // contract is 1/6 required docs
  { label: 'ID Verified', check: (e: OnboardingEmployee) => e.doc_verified >= 1 },
  { label: 'NSSF / NHIF Setup', check: (e: OnboardingEmployee) => e.doc_verified >= 3 },
  { label: 'KRA PIN Provided', check: (e: OnboardingEmployee) => e.doc_verified >= 4 },
  { label: 'Bank Details Confirmed', check: (e: OnboardingEmployee) => e.doc_verified >= 5 },
  { label: 'All Documents Complete', check: (e: OnboardingEmployee) => e.doc_pct === 100 },
]

function DocRing({ pct }: { pct: number }) {
  const r = 20
  const circ = 2 * Math.PI * r
  const color = pct === 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#ef4444'
  return (
    <div className="relative w-12 h-12 flex-shrink-0">
      <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
        <circle cx="24" cy="24" r={r} fill="none" stroke="#e2e8f0" strokeWidth="4" />
        <circle
          cx="24" cy="24" r={r} fill="none"
          stroke={color} strokeWidth="4"
          strokeDasharray={`${(pct / 100) * circ} ${circ}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-text-primary">
        {pct}%
      </span>
    </div>
  )
}

export function OnboardingClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)

  const { data, isLoading } = useQuery({
    queryKey: ['onboarding', activeCompanyId],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeCompanyId) params.set('companyId', activeCompanyId)
      const res = await fetch(`/api/onboarding?${params}`)
      if (!res.ok) throw new Error('Failed to fetch onboarding data')
      return res.json() as Promise<{ data: OnboardingEmployee[] }>
    },
  })

  const employees = data?.data ?? []
  const complete = employees.filter(e => e.doc_pct === 100).length
  const needsAttention = employees.filter(e => e.doc_pct < 50).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Onboarding</h1>
        <p className="text-sm text-text-muted mt-0.5">New employees in the last 90 days</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'New Hires (90d)', value: employees.length, icon: UserPlus, color: 'text-primary' },
          { label: 'Fully Onboarded', value: complete, icon: CheckCircle, color: 'text-green-600' },
          { label: 'Needs Attention', value: needsAttention, icon: AlertCircle, color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Employee onboarding cards */}
      {isLoading ? (
        <div className="grid gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : employees.length === 0 ? (
        <div className="card text-center py-16">
          <UserPlus className="w-12 h-12 text-border mx-auto mb-3" />
          <p className="text-text-muted">No new employees in the last 90 days.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {employees.map((emp) => (
            <div key={emp.id} className="card">
              <div className="flex items-start gap-4">
                <DocRing pct={emp.doc_pct} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={emp.user.avatar_url ?? undefined}
                        name={emp.user.full_name}
                        size="sm"
                      />
                      <div>
                        <Link
                          href={`/employees/${emp.id}`}
                          className="text-sm font-semibold text-text-primary hover:text-accent transition-colors"
                        >
                          {emp.user.full_name}
                        </Link>
                        <p className="text-xs text-text-muted">
                          {emp.job_title}{emp.department && <> · {emp.department}</>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={emp.employment_status} />
                      <span className="text-xs text-text-muted">Started {formatDate(emp.start_date)}</span>
                    </div>
                  </div>

                  {/* Document progress bar */}
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Documents: {emp.doc_verified}/{emp.doc_required} verified
                      </span>
                      <span>{emp.doc_pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          emp.doc_pct === 100 ? 'bg-green-500' :
                          emp.doc_pct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                        )}
                        style={{ width: `${emp.doc_pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Checklist */}
                  <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-1">
                    {CHECKLIST_ITEMS.map(({ label, check }) => {
                      const done = check(emp)
                      return (
                        <div key={label} className="flex items-center gap-1.5">
                          {done ? (
                            <CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          ) : (
                            <AlertCircle className="w-3.5 h-3.5 text-border flex-shrink-0" />
                          )}
                          <span className={cn('text-xs', done ? 'text-text-body' : 'text-text-muted')}>
                            {label}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
