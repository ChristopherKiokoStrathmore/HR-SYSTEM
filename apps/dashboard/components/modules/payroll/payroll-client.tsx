'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  useEmployeesWithPaymentStatus,
  usePaymentHistory,
  usePayEmployees,
  type PaymentMethodType,
  type EmployeeSalaryRow,
} from '@/lib/hooks/use-payroll'
import { useStore } from '@/lib/store'
import { toast } from '@/lib/toast'
import { formatKES } from '@hr/shared'
import { cn } from '@/lib/utils'
import {
  Users,
  Clock,
  DollarSign,
  CheckCircle,
  AlertCircle,
  FileSignature,
} from 'lucide-react'

// Import new components
import { PaymentSourceSelector } from './payment-source-selector'
import { DepartmentBadges } from './department-badges'
import { EmployeeSalaryTable } from './employee-salary-table'
import { PaymentHistoryTable } from './payment-history-table'
import { PayEmployeesModal } from './pay-employees-modal'
import { PayrollApprovalsList } from './payroll-approvals-list'
import { EmployeeRecordModal } from './employee-record-modal'

const TABS = [
  { id: 'employees', label: 'Pay Employees', icon: Users },
  { id: 'approvals', label: 'Approvals & Disbursement', icon: FileSignature },
  { id: 'history', label: 'Payment History', icon: Clock },
] as const

type TabId = (typeof TABS)[number]['id']

export function PayrollClient() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('employees')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [recordEmployee, setRecordEmployee] = useState<EmployeeSalaryRow | null>(null)

  const activeCompanyId = useStore((s) => s.activeCompanyId)

  // Fetch employee data with payment status
  const {
    data: employeeData,
    isLoading: employeesLoading,
  } = useEmployeesWithPaymentStatus(activeCompanyId)

  // Fetch payment history
  const { data: historyData, isLoading: historyLoading } = usePaymentHistory(
    activeCompanyId
  )

  // Pay employees mutation
  const payEmployees = usePayEmployees()

  const employees = employeeData?.data || []
  const departments = employeeData?.departments || []
  const historyRecords = historyData?.data || []

  // Employees already paid for the current period drop off the Pay Employees
  // table (they move to Payment History). Stats cards below still use the full
  // list so "Paid This Period" stays accurate.
  const payableEmployees = useMemo(
    () => employees.filter((e) => e.payment_status !== 'paid'),
    [employees]
  )

  // Calculate stats
  const stats = useMemo(() => {
    const totalEmployees = employees.length
    const paidCount = employees.filter((e) => e.payment_status === 'paid').length
    const pendingCount = employees.filter((e) => e.payment_status === 'pending').length
    const totalSalary = employees.reduce((sum, e) => sum + e.salary, 0)
    const paidAmount = employees
      .filter((e) => e.payment_status === 'paid')
      .reduce((sum, e) => sum + e.salary, 0)

    return { totalEmployees, paidCount, pendingCount, totalSalary, paidAmount }
  }, [employees])

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    // Select all pending employees (filtered by department if applicable)
    const pendingEmployees = employees.filter((e) => {
      if (e.payment_status !== 'pending') return false
      if (departmentFilter && e.department !== departmentFilter) return false
      return true
    })

    const allSelected = pendingEmployees.every((e) => selectedIds.has(e.id))

    if (allSelected) {
      // Deselect all
      setSelectedIds(new Set())
    } else {
      // Select all pending
      setSelectedIds(new Set(pendingEmployees.map((e) => e.id)))
    }
  }

  const selectByDepartment = (department: string) => {
    if (!department) {
      setDepartmentFilter(null)
      return
    }
    setDepartmentFilter(department)
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const handlePayAll = () => {
    const pendingEmployees = employees.filter((e) => e.payment_status === 'pending')
    setSelectedIds(new Set(pendingEmployees.map((e) => e.id)))
    setPayModalOpen(true)
  }

  const handlePayDepartment = (department: string) => {
    const pendingEmployees = employees.filter(
      (e) => e.payment_status === 'pending' && e.department === department
    )
    setSelectedIds(new Set(pendingEmployees.map((e) => e.id)))
    setPayModalOpen(true)
  }

  // Calculate selected totals
  const selectedEmployees = employees.filter((e) => selectedIds.has(e.id))
  const selectedTotal = selectedEmployees.reduce((sum, e) => sum + e.salary, 0)

  // Pay selected employees (M-Pesa via IntaSend, Bank/Airtel via PesaPal)
  const handlePaySelected = async (paymentMethod: PaymentMethodType) => {
    if (!activeCompanyId) {
      toast.error('No company selected')
      return
    }

    try {
      const result = await payEmployees.mutateAsync({
        employeeIds: Array.from(selectedIds),
        paymentMethod,
        companyId: activeCompanyId,
      })

      if (result.success) {
        toast.success(result.message || 'Payroll sent to the employer for signing')
        clearSelection()
        setPayModalOpen(false)
        // Take the user straight to the run so they can watch the signing status
        // and release payment once the employer has signed.
        if (result.runId) {
          router.push(`/payroll/${result.runId}`)
        } else {
          setActiveTab('approvals')
        }
      }
    } catch (err) {
      toast.error('Payment failed', String(err))
      throw err // Re-throw so modal can show error
    }
  }

  return (
    <div className="space-y-6">
      {/* Payment Source Selector */}
      <PaymentSourceSelector />

      {/* Department Badges */}
      <DepartmentBadges
        departments={departments}
        selectedDepartment={departmentFilter}
        onSelectDepartment={(dept) => setDepartmentFilter(dept)}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {stats.totalEmployees}
              </p>
              <p className="text-xs text-text-muted">Total Employees</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-success/10">
              <CheckCircle className="w-5 h-5 text-success" />
            </div>
            <div>
              <p className="text-2xl font-bold text-success">{stats.paidCount}</p>
              <p className="text-xs text-text-muted">Paid This Period</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-warning/10">
              <AlertCircle className="w-5 h-5 text-warning" />
            </div>
            <div>
              <p className="text-2xl font-bold text-warning">{stats.pendingCount}</p>
              <p className="text-xs text-text-muted">Pending Payment</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-accent/10">
              <DollarSign className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold text-text-primary">
                {formatKES(stats.paidAmount)}
              </p>
              <p className="text-xs text-text-muted">Disbursed This Period</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-surface-alt rounded-xl border border-border w-fit">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-white shadow-sm text-text-primary border border-border/50'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'employees' && !employeesLoading && employees.length > 0 && payableEmployees.length === 0 ? (
        <div className="card text-center py-12">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-success" />
          <p className="text-sm font-medium text-text-primary">All employees have been paid for this period</p>
          <p className="text-xs text-text-muted mt-1">
            Paid runs are available in the{' '}
            <button onClick={() => setActiveTab('history')} className="text-accent hover:underline">
              Payment History
            </button>{' '}
            tab.
          </p>
        </div>
      ) : activeTab === 'employees' ? (
        <EmployeeSalaryTable
          employees={payableEmployees}
          isLoading={employeesLoading}
          selectedIds={selectedIds}
          departmentFilter={departmentFilter}
          onToggleSelect={toggleSelect}
          onSelectAll={selectAll}
          onSelectDepartment={selectByDepartment}
          onClearSelection={clearSelection}
          onPaySelected={() => setPayModalOpen(true)}
          onPayAll={handlePayAll}
          onPayDepartment={handlePayDepartment}
          onRowClick={setRecordEmployee}
        />
      ) : activeTab === 'approvals' ? (
        <PayrollApprovalsList companyId={activeCompanyId} />
      ) : (
        <PaymentHistoryTable records={historyRecords} isLoading={historyLoading} />
      )}

      {/* Pay Modal with Payment Source Selection */}
      <PayEmployeesModal
        open={payModalOpen}
        selectedCount={selectedIds.size}
        totalAmount={selectedTotal}
        onClose={() => setPayModalOpen(false)}
        onConfirm={handlePaySelected}
      />

      {/* Employee record modal (row click) — summary, salary, deductions,
          history, and single-employee Send for Approval. */}
      <EmployeeRecordModal
        employee={recordEmployee}
        history={historyRecords}
        open={!!recordEmployee}
        onClose={() => setRecordEmployee(null)}
        isSending={payEmployees.isPending}
        onSendForApproval={(emp) => {
          // Reuse the exact same approval/signing flow as the bulk action by
          // selecting just this one employee and opening the pay modal.
          setSelectedIds(new Set([emp.id]))
          setRecordEmployee(null)
          setPayModalOpen(true)
        }}
      />
    </div>
  )
}
