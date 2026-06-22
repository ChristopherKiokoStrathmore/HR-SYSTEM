'use client'

import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import { useState, useMemo } from 'react'
import { Search, Clock, Filter, ChevronDown, ChevronUp, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

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

function useAuditLog(companyId: string | null, search: string, from: string, to: string) {
  return useQuery<AuditEntry[]>({
    queryKey: ['audit-log', companyId, search, from, to],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (companyId) params.set('companyId', companyId)
      if (search) params.set('search', search)
      if (from) params.set('from', from)
      if (to) params.set('to', to)
      const res = await fetch(`/api/audit-log?${params}`)
      if (!res.ok) throw new Error('Failed to fetch audit log')
      const { data } = await res.json()
      return data ?? []
    },
    staleTime: 30 * 1000,
  })
}

const ACTION_COLOR: Record<string, string> = {
  EMPLOYEE_CREATED: 'bg-green-50 text-green-700 border-green-200',
  EMPLOYEE_TERMINATED: 'bg-red-50 text-red-700 border-red-200',
  LEAVE_APPROVED: 'bg-accent/10 text-accent border-accent/20',
  LEAVE_REJECTED: 'bg-red-50 text-red-700 border-red-200',
  PAYROLL_DISBURSED: 'bg-primary/10 text-primary border-primary/20',
  DOCUMENT_VERIFIED: 'bg-green-50 text-green-700 border-green-200',
  DOCUMENT_REJECTED: 'bg-red-50 text-red-700 border-red-200',
  LEAVE_REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
  EMPLOYEE_UPDATED: 'bg-blue-50 text-blue-700 border-blue-200',
}

function actionColor(action: string) {
  return ACTION_COLOR[action] ?? 'bg-surface-alt text-text-muted border-border'
}

function formatTimestamp(ts: string) {
  return new Date(ts).toLocaleString('en-KE', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function DiffView({ old: oldVal, next }: { old: Record<string, unknown> | null; next: Record<string, unknown> | null }) {
  if (!oldVal && !next) return null
  const keys = Array.from(new Set([...Object.keys(oldVal ?? {}), ...Object.keys(next ?? {})]))

  return (
    <div className="mt-3 pt-3 border-t border-border">
      <p className="text-xs font-semibold text-text-muted mb-2">Changes</p>
      <div className="rounded-lg border border-border overflow-hidden text-xs font-mono">
        <div className="grid grid-cols-[auto_1fr_1fr] bg-surface-alt">
          <div className="px-3 py-1.5 text-text-muted font-sans font-medium">Field</div>
          <div className="px-3 py-1.5 text-red-600 font-sans font-medium border-l border-border">Before</div>
          <div className="px-3 py-1.5 text-green-600 font-sans font-medium border-l border-border">After</div>
        </div>
        {keys.map(key => {
          const before = oldVal?.[key]
          const after = next?.[key]
          const changed = JSON.stringify(before) !== JSON.stringify(after)
          return (
            <div key={key} className={cn('grid grid-cols-[auto_1fr_1fr] border-t border-border', changed && 'bg-amber-50/40')}>
              <div className="px-3 py-1.5 text-text-muted min-w-[120px] font-sans">{key}</div>
              <div className="px-3 py-1.5 text-red-700 border-l border-border truncate max-w-[200px]">
                {before !== undefined ? String(before) : <span className="text-text-muted italic">—</span>}
              </div>
              <div className="px-3 py-1.5 text-green-700 border-l border-border truncate max-w-[200px]">
                {after !== undefined ? String(after) : <span className="text-text-muted italic">—</span>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AuditLogClient() {
  const companyId = useStore((s) => s.activeCompanyId)
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const { data: entries, isLoading } = useAuditLog(companyId, search, from, to)

  const entityTypes = useMemo(() => Array.from(new Set(entries?.map(e => e.entity_type) ?? [])).sort(), [entries])

  const filtered = useMemo(() => {
    if (!entityFilter) return entries ?? []
    return (entries ?? []).filter(e => e.entity_type === entityFilter)
  }, [entries, entityFilter])

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Shield className="w-4 h-4 text-primary" />
          Audit Log
        </div>

        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search action, user…"
            className="input pl-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <select
            className="input pl-9 pr-8 text-sm appearance-none cursor-pointer min-w-[140px]"
            value={entityFilter}
            onChange={e => setEntityFilter(e.target.value)}
          >
            <option value="">All entities</option>
            {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <input type="date" className="input text-sm" value={from} onChange={e => setFrom(e.target.value)} title="From date" />
        <input type="date" className="input text-sm" value={to} onChange={e => setTo(e.target.value)} title="To date" />

        {(search || entityFilter || from || to) && (
          <button
            onClick={() => { setSearch(''); setEntityFilter(''); setFrom(''); setTo('') }}
            className="text-xs text-accent hover:underline"
          >
            Clear filters
          </button>
        )}

        <span className="ml-auto text-xs text-text-muted">{filtered.length} events</span>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-14 w-full rounded-xl" />
          ))}
        </div>
      )}

      {!isLoading && !filtered.length && (
        <div className="card text-center py-12">
          <Shield className="w-10 h-10 text-border mx-auto mb-3" />
          <p className="text-text-muted text-sm">No audit entries found</p>
          {(search || entityFilter || from || to) && (
            <p className="text-xs text-text-muted mt-1">Try adjusting your filters</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((entry) => (
          <div
            key={entry.id}
            className="card cursor-pointer hover:shadow-md transition-shadow p-4"
            onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
          >
            <div className="flex items-start gap-3">
              <Clock className="w-4 h-4 text-text-muted flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', actionColor(entry.action))}>
                    {entry.action.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-text-primary font-medium">{entry.entity_type}</span>
                  <span className="text-xs text-text-muted font-mono bg-surface-alt px-1.5 py-0.5 rounded">{entry.entity_id.slice(0, 8)}</span>
                </div>
                <p className="text-xs text-text-muted mt-1.5">
                  <span className="font-medium text-text-body">{entry.performed_by_user?.full_name ?? 'System'}</span>
                  {' · '}{formatTimestamp(entry.timestamp)}
                  {entry.ip_address && <span className="ml-2 font-mono text-[10px] bg-surface-alt px-1 py-0.5 rounded">{entry.ip_address}</span>}
                </p>
              </div>
              {(entry.old_values || entry.new_values) && (
                <div className="flex-shrink-0 text-text-muted">
                  {expanded === entry.id
                    ? <ChevronUp className="w-4 h-4" />
                    : <ChevronDown className="w-4 h-4" />}
                </div>
              )}
            </div>

            {expanded === entry.id && (
              <DiffView old={entry.old_values} next={entry.new_values} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
