'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, MoreVertical, UserX } from 'lucide-react'
import { useEmployee } from '@/lib/hooks/use-employees'
import { SkeletonCard } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/badge'
import { TerminationModal } from './termination-modal'
import { TabOverview } from './tabs/tab-overview'
import { TabDocuments } from './tabs/tab-documents'
import { TabLeave } from './tabs/tab-leave'
import { TabAttendance } from './tabs/tab-attendance'
import { TabPayroll } from './tabs/tab-payroll'
import { TabPerformance } from './tabs/tab-performance'
import { TabTraining } from './tabs/tab-training'
import { TabMedical } from './tabs/tab-medical'
import { TabBackgroundChecks } from './tabs/tab-background-checks'
import { TabActivityLog } from './tabs/tab-activity-log'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'documents', label: 'Documents' },
  { id: 'leave', label: 'Leave' },
  { id: 'attendance', label: 'Attendance' },
  { id: 'payroll', label: 'Payroll' },
  { id: 'performance', label: 'Performance' },
  { id: 'training', label: 'Training' },
  { id: 'medical', label: 'Medical' },
  { id: 'background', label: 'Background Checks' },
  { id: 'activity', label: 'Activity Log' },
] as const

type TabId = (typeof TABS)[number]['id']

export function EmployeeProfileClient({ id }: { id: string }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [terminationOpen, setTerminationOpen] = useState(false)

  const { data, isLoading, error } = useEmployee(id)
  const employee = data?.data

  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (error || !employee) {
    return (
      <div className="card text-center py-12">
        <p className="text-text-muted">Employee not found.</p>
        <button onClick={() => router.back()} className="btn-ghost mt-4">Go Back</button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-surface-alt transition-colors text-text-muted"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-text-primary">{employee.user?.full_name}</h1>
          <p className="text-sm text-text-muted">{employee.employee_number} · {employee.company?.name}</p>
        </div>
        <StatusBadge status={employee.employment_status} />
        {(employee.employment_status === 'active' || employee.employment_status === 'on_leave') && (
          <button
            onClick={() => setTerminationOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-danger hover:bg-danger/10 transition-colors border border-danger/20"
          >
            <UserX className="w-4 h-4" />
            Terminate
          </button>
        )}
      </div>

      {/* Profile hero card */}
      <div className="card flex flex-col md:flex-row gap-6">
        <div className="flex items-center gap-4">
          <Avatar src={employee.user?.avatar_url} name={employee.user?.full_name ?? '?'} size="xl" />
          <div>
            <h2 className="text-xl font-bold text-text-primary">{employee.user?.full_name}</h2>
            <p className="text-text-muted">{employee.job_title}</p>
            {employee.department && <p className="text-sm text-text-muted">{employee.department}</p>}
            <p className="text-sm text-text-muted mt-1">{employee.user?.email}</p>
          </div>
        </div>

        <div className="md:ml-auto grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
          {[
            ['Company', employee.company?.name ?? '—'],
            ['Start Date', employee.start_date],
            ['Type', employee.employment_type.replace('_', ' ')],
            ['Payment', employee.payment_method.toUpperCase()],
            ['Manager', employee.manager?.full_name ?? 'None'],
            ['Language', employee.user?.preferred_language?.toUpperCase() ?? 'EN'],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-text-muted text-xs">{label}</p>
              <p className="text-text-primary font-medium capitalize">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border overflow-x-auto">
        <nav className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-body'
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && <TabOverview employee={employee} />}
        {activeTab === 'documents' && <TabDocuments employeeId={id} tenantId={employee.tenant_id} />}
        {activeTab === 'leave' && <TabLeave employeeId={id} />}
        {activeTab === 'attendance' && <TabAttendance employeeId={id} />}
        {activeTab === 'payroll' && <TabPayroll employeeId={id} />}
        {activeTab === 'performance' && <TabPerformance employeeId={id} />}
        {activeTab === 'training' && <TabTraining employeeId={id} companyId={employee.company_id} />}
        {activeTab === 'medical' && <TabMedical employeeId={id} />}
        {activeTab === 'background' && <TabBackgroundChecks employeeId={id} />}
        {activeTab === 'activity' && <TabActivityLog employeeId={id} />}
      </div>

      <TerminationModal
        open={terminationOpen}
        employeeId={id}
        employeeName={employee.user?.full_name ?? ''}
        onClose={() => setTerminationOpen(false)}
      />
    </div>
  )
}
