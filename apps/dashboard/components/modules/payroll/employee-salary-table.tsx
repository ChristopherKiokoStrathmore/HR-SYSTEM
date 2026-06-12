'use client'

import { useState, useMemo } from 'react'
import { Search, Square, CheckSquare, CreditCard, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatKES } from '@hr/shared'
import { StatusBadge } from '@/components/ui/badge'
import { SkeletonTable } from '@/components/ui/skeleton'
import type { EmployeeSalaryRow } from '@/lib/hooks/use-payroll'

interface EmployeeSalaryTableProps {
  employees: EmployeeSalaryRow[]
  isLoading: boolean
  selectedIds: Set<string>
  departmentFilter: string | null
  onToggleSelect: (id: string) => void
  onSelectAll: () => void
  onSelectDepartment: (department: string) => void
  onClearSelection: () => void
  onPaySelected: () => void
  onPayAll: () => void
  onPayDepartment: (department: string) => void
}

export function EmployeeSalaryTable({
  employees,
  isLoading,
  selectedIds,
  departmentFilter,
  onToggleSelect,
  onSelectAll,
  onSelectDepartment,
  onClearSelection,
  onPaySelected,
  onPayAll,
  onPayDepartment,
}: EmployeeSalaryTableProps) {
  const [search, setSearch] = useState('')

  // Filter employees by search and department
  const filteredEmployees = useMemo(() => {
    let result = employees

    // Filter by department
    if (departmentFilter) {
      result = result.filter((emp) => emp.department === departmentFilter)
    }

    // Filter by search
    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(
        (emp) =>
          emp.employee_name.toLowerCase().includes(searchLower) ||
          emp.department?.toLowerCase().includes(searchLower) ||
          emp.employee_number.toLowerCase().includes(searchLower)
      )
    }

    return result
  }, [employees, departmentFilter, search])

  // Get unique departments from filtered results
  const departments = useMemo(() => {
    const depts = new Set<string>()
    filteredEmployees.forEach((emp) => {
      if (emp.department) depts.add(emp.department)
    })
    return Array.from(depts).sort()
  }, [filteredEmployees])

  // Calculate totals for selected employees
  const selectedEmployees = useMemo(
    () => filteredEmployees.filter((emp) => selectedIds.has(emp.id)),
    [filteredEmployees, selectedIds]
  )
  const selectedTotal = selectedEmployees.reduce((sum, emp) => sum + emp.salary, 0)

  // Only pending employees can be selected
  const pendingEmployees = filteredEmployees.filter(
    (emp) => emp.payment_status === 'pending'
  )
  const pendingDepartmentEmployees = departmentFilter
    ? pendingEmployees.filter((emp) => emp.department === departmentFilter)
    : []
  const allPendingSelected =
    pendingEmployees.length > 0 &&
    pendingEmployees.every((emp) => selectedIds.has(emp.id))

  if (isLoading) {
    return <SkeletonTable rows={8} cols={6} />
  }

  return (
    <div className="space-y-4">
      {/* Search and filter bar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 w-full"
          />
        </div>

        {/* Quick department select */}
        {departments.length > 0 && (
          <select
            className="input w-48"
            value={departmentFilter || ''}
            onChange={(e) => onSelectDepartment(e.target.value || '')}
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Bulk action bar */}
      <div className="grid gap-3 rounded-xl border border-border bg-surface-alt p-4 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-text-muted">Pending</p>
          <p className="text-sm font-semibold text-text-primary">
            {pendingEmployees.length} employee{pendingEmployees.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-wide text-text-muted">Department filter</p>
          <p className="text-sm font-semibold text-text-primary">
            {departmentFilter ?? 'All departments'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPayAll}
            disabled={pendingEmployees.length === 0}
            className="btn-secondary text-sm"
          >
            Pay all pending
          </button>
          {departmentFilter && (
            <button
              type="button"
              onClick={() => onPayDepartment(departmentFilter)}
              disabled={pendingDepartmentEmployees.length === 0}
              className="btn-secondary text-sm"
            >
              Pay {departmentFilter}
            </button>
          )}
          {selectedIds.size > 0 && (
            <button
              type="button"
              onClick={onPaySelected}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <CreditCard className="w-4 h-4" />
              Pay Selected
            </button>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 px-4 py-3 bg-accent/10 border border-accent/20 rounded-xl">
          <span className="text-sm font-medium text-accent">
            {selectedIds.size} employee{selectedIds.size !== 1 ? 's' : ''} selected
          </span>
          <span className="text-sm text-accent/80">({formatKES(selectedTotal)})</span>
          <div className="flex-1" />
          <button
            onClick={onClearSelection}
            className="text-xs text-text-muted hover:text-text-primary"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-alt border-b border-border">
                <th className="w-10 px-4 py-3 text-left">
                  <button
                    onClick={onSelectAll}
                    className="text-text-muted hover:text-accent transition-colors"
                    title={allPendingSelected ? 'Deselect all' : 'Select all pending'}
                  >
                    {allPendingSelected ? (
                      <CheckSquare className="w-5 h-5 text-accent" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Employee
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Department
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Salary
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-text-muted uppercase tracking-wide">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-text-muted">
                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No employees found</p>
                    {search && (
                      <p className="text-xs mt-1">
                        Try adjusting your search or filter
                      </p>
                    )}
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isSelected = selectedIds.has(emp.id)
                  const isPending = emp.payment_status === 'pending'

                  return (
                    <tr
                      key={emp.id}
                      className={cn(
                        'hover:bg-surface-alt/50 transition-colors',
                        isSelected && 'bg-accent/5'
                      )}
                    >
                      <td className="px-4 py-3">
                        {isPending ? (
                          <button
                            onClick={() => onToggleSelect(emp.id)}
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
                          <p className="font-medium text-text-primary">
                            {emp.employee_name}
                          </p>
                          <p className="text-xs text-text-muted">
                            {emp.employee_number}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-text-body">
                        {emp.department || (
                          <span className="text-text-muted italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-text-primary">
                        {formatKES(emp.salary)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={emp.payment_status} />
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
          <span>
            Showing {filteredEmployees.length} of {employees.length} employees
          </span>
          <span>
            Total: {formatKES(filteredEmployees.reduce((sum, emp) => sum + emp.salary, 0))}
          </span>
        </div>
      </div>
    </div>
  )
}
