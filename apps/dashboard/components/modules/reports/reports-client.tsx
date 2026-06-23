'use client'

import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { Users, DollarSign, Calendar, TrendingUp, FileText, Printer } from 'lucide-react'

const COLORS = ['#1A2E5A', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4']

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: string | number; icon: typeof Users; sub?: string }) {
  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
        <span className="text-sm text-text-muted">{label}</span>
      </div>
      <p className="text-2xl font-bold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-semibold text-text-primary mt-2">{children}</h2>
}

function formatKES(n: number) {
  return new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

async function fetchReport(endpoint: string, companyId?: string | null) {
  const params = companyId ? `?companyId=${companyId}` : ''
  const res = await fetch(`/api/reports/${endpoint}${params}`)
  if (!res.ok) throw new Error('Failed to fetch report')
  const { data } = await res.json()
  return data
}

function exportExcel(companyId?: string | null) {
  const params = new URLSearchParams({ format: 'xlsx', type: 'full' })
  if (companyId) params.set('companyId', companyId)
  window.location.href = `/api/exports?${params}`
}

function exportPDF() {
  const title = document.title
  document.title = `Sheer Logic HR Report — ${new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}`
  window.print()
  document.title = title
}

export function ReportsClient() {
  const companyId = useStore((s) => s.activeCompanyId)

  const { data: hc } = useQuery({
    queryKey: ['reports', 'headcount', companyId],
    queryFn: () => fetchReport('headcount', companyId),
    staleTime: 60 * 1000,
  })

  const { data: ps } = useQuery({
    queryKey: ['reports', 'payroll-summary', companyId],
    queryFn: () => fetchReport('payroll-summary', companyId),
    staleTime: 60 * 1000,
  })

  const { data: ls } = useQuery({
    queryKey: ['reports', 'leave-summary', companyId],
    queryFn: () => fetchReport('leave-summary', companyId),
    staleTime: 60 * 1000,
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Reports & Analytics</h1>
          <p className="text-sm text-text-muted mt-0.5">Workforce insights · {new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportPDF}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-light transition-colors"
          >
            <Printer className="w-4 h-4" />
            Export PDF
          </button>
          <button
            onClick={() => exportExcel(companyId)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-border bg-surface text-sm font-medium text-text-primary hover:bg-surface-alt transition-colors"
          >
            <FileText className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Employees" value={hc?.total ?? '—'} icon={Users} sub={`${hc?.active ?? 0} active`} />
        <StatCard
          label="Latest Payroll"
          value={ps?.latest ? `KES ${formatKES(ps.latest.total_net)}` : '—'}
          icon={DollarSign}
          sub="Net disbursed"
        />
        <StatCard label="Leave Requests" value={ls?.totalRequests ?? '—'} icon={Calendar} sub={`${ls?.approvedDays ?? 0} days approved`} />
        <StatCard label="Departments" value={hc?.byDepartment?.length ?? '—'} icon={TrendingUp} sub="Active teams" />
      </div>

      {/* Headcount charts */}
      <SectionTitle>Headcount Analysis</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By department bar */}
        <div className="card">
          <p className="font-medium text-text-body mb-4 text-sm">By Department</p>
          {hc?.byDepartment?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={hc.byDepartment} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="value" name="Employees" fill="#1A2E5A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton h-48 w-full" />
          )}
        </div>

        {/* By gender pie */}
        <div className="card">
          <p className="font-medium text-text-body mb-4 text-sm">By Gender</p>
          {hc?.byGender?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={hc.byGender} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {hc.byGender.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton h-48 w-full" />
          )}
        </div>
      </div>

      {/* Monthly hires line */}
      <div className="card">
        <p className="font-medium text-text-body mb-4 text-sm">Monthly Hires (Last 12 Months)</p>
        {hc?.monthlyHires?.length ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={hc.monthlyHires} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" name="New Hires" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="skeleton h-48 w-full" />
        )}
      </div>

      {/* Payroll charts */}
      <SectionTitle>Payroll Trend</SectionTitle>
      <div className="card">
        <p className="font-medium text-text-body mb-4 text-sm">Gross vs Net (KES, Last 12 Months)</p>
        {ps?.trend?.length ? (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ps.trend} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={formatKES} />
              <Tooltip formatter={(v: number) => [`KES ${v.toLocaleString()}`, '']} />
              <Legend />
              <Bar dataKey="gross" name="Gross" fill="#1A2E5A" radius={[2, 2, 0, 0]} />
              <Bar dataKey="deductions" name="Deductions" fill="#EF4444" radius={[2, 2, 0, 0]} />
              <Bar dataKey="net" name="Net" fill="#10B981" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="skeleton h-52 w-full" />
        )}
      </div>

      {/* Leave charts */}
      <SectionTitle>Leave Overview</SectionTitle>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <p className="font-medium text-text-body mb-4 text-sm">Days Taken by Type</p>
          {ls?.byType?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ls.byType} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" name="Days" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton h-48 w-full" />
          )}
        </div>

        <div className="card">
          <p className="font-medium text-text-body mb-4 text-sm">Requests by Status</p>
          {ls?.byStatus?.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={ls.byStatus} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {ls.byStatus.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="skeleton h-48 w-full" />
          )}
        </div>
      </div>
    </div>
  )
}
