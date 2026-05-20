'use client'

import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import { useState } from 'react'
import { Search, Clock } from 'lucide-react'

interface AuditEntry {
  id: string
  action: string
  entity_type: string
  entity_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  ip_address: string | null
  timestamp: string
  performed_by_user: { full_name: string } | null
}

function useAuditLog(companyId: string | null, search: string) {
  return useQuery<AuditEntry[]>({
    queryKey: ['audit-log', companyId, search],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (companyId) params.set('companyId', companyId)
      if (search) params.set('search', search)
      const res = await fetch(`/api/audit-log?${params}`)
      if (!res.ok) throw new Error('Failed to fetch audit log')
      const { data } = await res.json()
      return data ?? []
    },
    staleTime: 30 * 1000,
  })
}

const ACTION_COLOR: Record<string, string> = {
  EMPLOYEE_CREATED: 'bg-success/10 text-success',
  EMPLOYEE_TERMINATED: 'bg-danger/10 text-danger',
  LEAVE_APPROVED: 'bg-accent/10 text-accent',
  LEAVE_REJECTED: 'bg-danger/10 text-danger',
  PAYROLL_DISBURSED: 'bg-primary/10 text-primary',
  DOCUMENT_VERIFIED: 'bg-success/10 text-success',
}

function actionColor(action: string) {
  return ACTION_COLOR[action] ?? 'bg-border text-text-muted'
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function AuditLogClient() {
  const companyId = useStore((s) => s.activeCompanyId)
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const { data: entries, isLoading } = useAuditLog(companyId, search)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="font-semibold text-text-primary">Audit Log</h2>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search action, entity..."
            className="input pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && !entries?.length && (
        <div className="card text-center py-10 text-text-muted text-sm">No audit entries found</div>
      )}

      <div className="space-y-2">
        {entries?.map((entry) => (
          <div key={entry.id} className="card cursor-pointer" onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}>
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${actionColor(entry.action)}`}>
                    {entry.action}
                  </span>
                  <span className="text-sm text-text-primary font-medium">{entry.entity_type}</span>
                  <span className="text-xs text-text-muted font-mono">{entry.entity_id.slice(0, 8)}</span>
                </div>
                <p className="text-xs text-text-muted mt-1">
                  {entry.performed_by_user?.full_name ?? 'System'} · {formatTimestamp(entry.timestamp)}
                  {entry.ip_address && ` · ${entry.ip_address}`}
                </p>
              </div>
            </div>

            {expanded === entry.id && (entry.old_values || entry.new_values) && (
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
                {entry.old_values && (
                  <div>
                    <p className="font-medium text-text-muted mb-1">Before</p>
                    <pre className="bg-surface rounded-lg p-2 overflow-auto text-text-body font-mono text-[10px] max-h-32">
                      {JSON.stringify(entry.old_values, null, 2)}
                    </pre>
                  </div>
                )}
                {entry.new_values && (
                  <div>
                    <p className="font-medium text-text-muted mb-1">After</p>
                    <pre className="bg-surface rounded-lg p-2 overflow-auto text-text-body font-mono text-[10px] max-h-32">
                      {JSON.stringify(entry.new_values, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
