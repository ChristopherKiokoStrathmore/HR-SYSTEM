'use client'

import { useQuery } from '@tanstack/react-query'
import { SkeletonTable } from '@/components/ui/skeleton'
import { formatDate, isExpiringSoon, isExpired } from '@hr/shared'
import type { BackgroundCheckWithSubject, BackgroundCheckStatus, BackgroundCheckType } from '@hr/shared'
import { AlertTriangle, ShieldCheck, CheckCircle, XCircle, Clock, Flag, FileSearch } from 'lucide-react'
import { cn } from '@/lib/utils'

const CHECK_TYPE_LABELS: Record<BackgroundCheckType, string> = {
  criminal: 'Criminal Record (PCC)',
  credit: 'Credit Check',
  employment: 'Employment Verification',
  education: 'Education Verification',
  professional: 'Professional License',
}

const STATUS_CONFIG: Record<BackgroundCheckStatus, { icon: typeof CheckCircle; color: string; bg: string; label: string }> = {
  pending: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Pending' },
  in_progress: { icon: FileSearch, color: 'text-blue-600', bg: 'bg-blue-50', label: 'In Progress' },
  completed: { icon: FileSearch, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Awaiting Review' },
  passed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Passed' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Failed' },
  flagged: { icon: Flag, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Flagged' },
}

export function TabBackgroundChecks({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['background-checks-employee', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/background-checks?employeeId=${employeeId}`)
      return res.json() as Promise<{ data: BackgroundCheckWithSubject[] }>
    },
  })

  const checks = data?.data ?? []
  const latestCriminal = checks.find(c => c.check_type === 'criminal' && c.status === 'passed')
  const hasFailed = checks.some(c => c.status === 'failed')
  const hasFlagged = checks.some(c => c.status === 'flagged')
  const hasExpired = checks.some(c => c.expiry_date && isExpired(c.expiry_date))

  return (
    <div className="space-y-4">
      {/* Current clearance status */}
      {latestCriminal && (
        <div className="card p-4">
          <p className="text-xs text-text-muted mb-2">Criminal Record Clearance</p>
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium text-green-600 bg-green-50">
              <ShieldCheck className="w-4 h-4" />
              Cleared
            </span>
            {latestCriminal.expiry_date && (
              <div className="text-right">
                <p className="text-xs text-text-muted">Expires</p>
                <p className={cn('text-sm font-medium',
                  isExpired(latestCriminal.expiry_date) ? 'text-red-600' :
                  isExpiringSoon(latestCriminal.expiry_date, 30) ? 'text-amber-600' :
                  'text-text-primary'
                )}>
                  {formatDate(latestCriminal.expiry_date)}
                </p>
              </div>
            )}
          </div>
          {latestCriminal.expiry_date && isExpired(latestCriminal.expiry_date) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 rounded px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              PCC has expired - renewal required.
            </div>
          )}
          {latestCriminal.expiry_date && isExpiringSoon(latestCriminal.expiry_date, 30) && !isExpired(latestCriminal.expiry_date) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 rounded px-3 py-2">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
              PCC expiring soon - schedule renewal.
            </div>
          )}
        </div>
      )}

      {/* Alerts */}
      {(hasFailed || hasFlagged || hasExpired) && !latestCriminal && (
        <div className="space-y-2">
          {hasFailed && (
            <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <XCircle className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">One or more background checks failed.</span>
            </div>
          )}
          {hasFlagged && (
            <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <Flag className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium">One or more background checks flagged for review.</span>
            </div>
          )}
        </div>
      )}

      {/* All checks */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Background Check History</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={4} />
        ) : checks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ShieldCheck className="w-10 h-10 text-border" />
            <p className="text-text-muted text-sm">No background checks found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {checks.map((check) => {
              const config = STATUS_CONFIG[check.status]
              const StatusIcon = config.icon
              const isExp = check.expiry_date ? isExpired(check.expiry_date) : false
              const isSoon = check.expiry_date ? isExpiringSoon(check.expiry_date, 30) && !isExp : false

              return (
                <div key={check.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">
                        {CHECK_TYPE_LABELS[check.check_type]}
                      </p>
                      <div className="flex gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-text-muted">
                          Requested: {formatDate(check.requested_at)}
                        </span>
                        {check.clearance_date && (
                          <span className="text-xs text-text-muted">
                            Cleared: {formatDate(check.clearance_date)}
                          </span>
                        )}
                        {check.expiry_date && (
                          <span className={cn('text-xs',
                            isExp ? 'text-red-600 font-medium' :
                            isSoon ? 'text-amber-600 font-medium' :
                            'text-text-muted'
                          )}>
                            Expires: {formatDate(check.expiry_date)}
                            {isExp ? ' (expired)' : isSoon ? ' (expiring soon)' : ''}
                          </span>
                        )}
                      </div>
                      {check.flags && check.flags.length > 0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          Flags: {check.flags.join(', ')}
                        </p>
                      )}
                    </div>
                    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', config.bg, config.color)}>
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </div>
                  {check.result_summary && (
                    <p className="text-xs text-text-muted mt-2">{check.result_summary}</p>
                  )}
                  {check.notes && (
                    <p className="text-xs text-text-muted mt-1 italic">{check.notes}</p>
                  )}
                  {check.document_url && (
                    <a
                      href={check.document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      View Document
                    </a>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
