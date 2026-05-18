import type { Metadata } from 'next'
import { EmployeeListClient } from '@/components/modules/employees/employee-list-client'

export const metadata: Metadata = { title: 'Employees' }

export default function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Employees</h1>
        <p className="text-sm text-text-muted mt-1">Manage all employees across client companies</p>
      </div>
      <EmployeeListClient />
    </div>
  )
}
