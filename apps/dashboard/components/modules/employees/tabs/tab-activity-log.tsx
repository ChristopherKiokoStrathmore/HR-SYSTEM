'use client'

import { useQuery } from '@tanstack/react-query'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDate } from '@hr/shared'
import type { AuditLog } from '@hr/shared'
import {
  UserCheck, FileText, CreditCard, Calendar,
  BookOpen, Heart, Award, AlertCircle, Activity,
} from 'lucide-react'

const ACTION_ICONS: Record<string, React.ElementType> = {
  EMPLOYEE_CREATED: UserCheck,
  EMPLOYEE_UPDATED: UserCheck,
  EMPLOYEE_TERMINATED: AlertCircle,
  DOCUMENT_UPLOADED: FileText,
  DOCUMENT_VERIFIED: FileText,
  DOCUMENT_REJECTED: FileText,
  PAYROLL_PROCESSED: CreditCard,
  LEAVE_REQUESTED: Calendar,
  LEAVE_APPROVED: Calendar,
  LEAVE_REJECTED: Calendar,
  ATTENDANCE_CHECKED_IN: Activity,
  ATTENDANCE_CHECKED_OUT: Activity,
  TRAINING_ENROLLED: BookOpen,
  TRAINING_COMPLETED: BookOpen,
  MEDICAL_RECORD_ADDED: Heart,
  KPI_ASSIGNED: Award,
  PERFORMANCE_REVIEWED: Award,
}

const ACTION_COLORS: Record<string, string> = {
  EMPLOYEE_TERMINATED: 'text-red-600 bg-red-50',
  DOCUMENT_REJECTED: 'text-red-600 bg-red-50',
  LEAVE_REJECTED: 'text-red-600 bg-red-50',
  LEAVE_APPROVED: 'text-green-600 bg-green-50',
  DOCUMENT_VERIFIED: 'text-green-600 bg-green-50',
  TRAINING_COMPLETED: 'text-green-600 bg-green-50',
  PAYROLL_PROCESSED: 'text-blue-600 bg-blue-50',
}

function actionLabel(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
}

interface AuditLogWithUser extends AuditLog {
  performed_by_user?: { full_name: string }
}

export function TabActivityLog({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['activity-log', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/audit-log?entityId=${employeeId}`)
      return res.json() as Promise<{ data: AuditLogWithUser[] }>
    },
  })

  const logs = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Activity Timeline</h3>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="w-8 h-8 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-40" />
                  <Skeleton className="h-2 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : logs.length === 0 ? (
          <p className="text-text-muted text-sm p-6 text-center">No activity recorded yet.</p>
        ) : (
          <div className="px-4 py-4">
            <ol className="relative border-l border-border ml-3">
              {logs.map((log, idx) => {
                const Icon = ACTION_ICONS[log.action] ?? Activity
                const colorClass = ACTION_COLORS[log.action] ?? 'text-text-muted bg-surface'
                const changedValues = log.new_values ?? log.old_values

                return (
                  <li key={log.id} className={`pl-6 ${idx < logs.length - 1 ? 'pb-5' : ''}`}>
                    {/* Timeline dot */}
                    <span className={`absolute -left-3.5 flex items-center justify-center w-7 h-7 rounded-full ${colorClass}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </span>

                    <div>
                      <p className="text-sm font-medium text-text-primary">
                        {actionLabel(log.action)}
                      </p>
                      <p className="text-xs text-text-muted mt-0.5">
                        {formatDate(log.timestamp)}
                        {log.performed_by_user?.full_name && (
                          <> · by {log.performed_by_user.full_name}</>
                        )}
                      </p>
                      {changedValues && Object.keys(changedValues).length > 0 && (
                        <div className="mt-1.5 text-xs text-text-body bg-surface rounded px-2 py-1.5 space-y-0.5">
                          {Object.entries(changedValues).slice(0, 3).map(([k, v]) => (
                            <p key={k} className="font-mono">
                              <span className="text-text-muted">{k}:</span>{' '}
                              <span className="text-text-primary">{String(v)}</span>
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
