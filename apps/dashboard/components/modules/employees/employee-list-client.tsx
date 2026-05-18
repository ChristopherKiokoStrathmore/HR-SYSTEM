'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, SlidersHorizontal } from 'lucide-react'
import { useEmployees } from '@/lib/hooks/use-employees'
import { DataTable, type Column } from '@/components/ui/data-table'
import { StatusBadge } from '@/components/ui/badge'
import { Avatar } from '@/components/ui/avatar'
import { CreateEmployeeModal } from './create-employee-modal'
import { formatDate, formatKES } from '@hr/shared'
import type { EmployeeWithUser } from '@hr/shared'

export function EmployeeListClient() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const { data, isLoading } = useEmployees({
    search,
    page,
    pageSize: 25,
    status: statusFilter || undefined,
    employmentType: typeFilter || undefined,
  })

  const columns: Column<EmployeeWithUser>[] = [
    {
      key: 'name',
      header: 'Employee',
      render: (row) => (
        <button
          type="button"
          onClick={() => router.push(`/employees/${row.id}`)}
          className="flex items-center gap-3 w-full text-left"
        >
          <Avatar src={row.user?.avatar_url} name={row.user?.full_name ?? '?'} size="sm" />
          <div>
            <p className="font-medium text-text-primary text-sm">{row.user?.full_name}</p>
            <p className="text-xs text-text-muted">{row.employee_number}</p>
          </div>
        </button>
      ),
    },
    {
      key: 'company',
      header: 'Company',
      render: (row) => (
        <span className="text-sm text-text-body">{row.company?.name ?? '—'}</span>
      ),
    },
    {
      key: 'role',
      header: 'Role / Dept',
      render: (row) => (
        <div>
          <p className="text-sm text-text-body">{row.job_title}</p>
          {row.department && <p className="text-xs text-text-muted">{row.department}</p>}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <span className="text-xs text-text-muted capitalize">
          {row.employment_type.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'salary',
      header: 'Salary',
      render: (row) => (
        <span className="text-sm font-medium text-text-primary">
          {formatKES(row.salary, true)}
        </span>
      ),
    },
    {
      key: 'start_date',
      header: 'Start Date',
      render: (row) => (
        <span className="text-sm text-text-body">{formatDate(row.start_date)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row) => <StatusBadge status={row.employment_status} />,
    },
  ]

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search name, number, department…"
            className="input pl-9 h-9 text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="input h-9 text-sm w-40"
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="on_leave">On Leave</option>
          <option value="suspended">Suspended</option>
          <option value="terminated">Terminated</option>
          <option value="resigned">Resigned</option>
        </select>

        <select
          value={typeFilter}
          onChange={(e) => { setTypeFilter(e.target.value); setPage(1) }}
          className="input h-9 text-sm w-40"
        >
          <option value="">All Types</option>
          <option value="white_collar">White Collar</option>
          <option value="casual">Casual</option>
        </select>

        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2 h-9 text-sm px-4 ml-auto"
        >
          <Plus className="w-4 h-4" />
          Add Employee
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        isLoading={isLoading}
        total={data?.count ?? 0}
        page={page}
        pageSize={25}
        onPageChange={setPage}
        onRowClick={(row) => router.push(`/employees/${row.id}`)}
        keyExtractor={(row) => row.id}
        emptyMessage="No employees found. Add your first employee."
      />

      <CreateEmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
