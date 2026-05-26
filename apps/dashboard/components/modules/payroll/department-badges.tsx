'use client'

import { cn } from '@/lib/utils'
import type { DepartmentPaymentStatus } from '@/lib/hooks/use-payroll'

interface DepartmentBadgesProps {
  departments: DepartmentPaymentStatus[]
  selectedDepartment: string | null
  onSelectDepartment: (department: string | null) => void
}

export function DepartmentBadges({
  departments,
  selectedDepartment,
  onSelectDepartment,
}: DepartmentBadgesProps) {
  if (departments.length === 0) {
    return null
  }

  const getStatusColor = (status: DepartmentPaymentStatus['status']) => {
    switch (status) {
      case 'all_paid':
        return 'bg-success/10 text-success border-success/20 hover:bg-success/20'
      case 'partial':
        return 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20'
      case 'none_paid':
        return 'bg-danger/10 text-danger border-danger/20 hover:bg-danger/20'
    }
  }

  const getStatusDot = (status: DepartmentPaymentStatus['status']) => {
    switch (status) {
      case 'all_paid':
        return 'bg-success'
      case 'partial':
        return 'bg-warning'
      case 'none_paid':
        return 'bg-danger'
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-body">Departments</span>
        {selectedDepartment && (
          <button
            onClick={() => onSelectDepartment(null)}
            className="text-xs text-accent hover:underline"
          >
            Clear filter
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {departments.map((dept) => (
          <button
            key={dept.department}
            onClick={() =>
              onSelectDepartment(
                selectedDepartment === dept.department ? null : dept.department
              )
            }
            className={cn(
              'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
              getStatusColor(dept.status),
              selectedDepartment === dept.department && 'ring-2 ring-offset-1 ring-accent'
            )}
          >
            <span
              className={cn('w-2 h-2 rounded-full', getStatusDot(dept.status))}
            />
            <span>{dept.department}</span>
            <span className="text-[10px] opacity-75">
              ({dept.paidCount}/{dept.totalEmployees})
            </span>
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-text-muted pt-1">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-success" />
          <span>All paid</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span>Partial</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-danger" />
          <span>None paid</span>
        </div>
      </div>
    </div>
  )
}
