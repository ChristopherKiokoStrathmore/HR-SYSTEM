'use client'

import { useState } from 'react'
import { useComplianceAlerts, useAcknowledgeAlert } from '@/lib/hooks/use-compliance'
import { SkeletonTable } from '@/components/ui/skeleton'
import { LottieEmpty } from '@/components/ui/lottie-empty'
import { toast } from '@/lib/toast'
import { formatDate } from '@hr/shared'
import type { ComplianceAlert } from '@hr/shared'
import { AlertTriangle, CheckCircle, ShieldOff, Filter, ChevronDown, Eye } from 'lucide-react'

const ALERT_TYPE_LABELS: Record<string, string> = {
  below_minimum_wage: 'Below Minimum Wage',
  certificate_expired: 'Certificate Expired',
  other: 'Other',
}

const ALERT_TYPE_COLORS: Record<string, string> = {
  below_minimum_wage: 'bg-red-50 text-red-700 border-red-200',
  certificate_expired: 'bg-amber-50 text-amber-700 border-amber-200',
  other: 'bg-surface-alt text-text-muted border-border',
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-red-50 text-red-700',
  acknowledged: 'bg-amber-50 text-amber-700',
  resolved: 'bg-green-50 text-green-700',
}

function DetailModal({
  alert,
  onClose,
  onAcknowledge,
  onResolve,
  isActing,
}: {
  alert: ComplianceAlert | null
  onClose: () => void
  onAcknowledge: (id: string) => void
  onResolve: (id: string) => void
  isActing: boolean
}) {
  if (!alert) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
            </h3>
            <p className="text-xs text-text-muted mt-0.5">{formatDate(alert.created_at)}</p>
          </div>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[alert.status]}`}>
            {alert.status}
          </span>
        </div>

        {Object.keys(alert.details).length > 0 && (
          <div className="rounded-lg bg-surface-alt border border-border p-3 space-y-1">
            {Object.entries(alert.details).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-text-muted capitalize">{k.replace(/_/g, ' ')}</span>
                <span className="text-text-primary font-medium">{String(v)}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-3 pt-2 border-t border-border">
          <button onClick={onClose} className="btn-ghost flex-1 text-sm">Close</button>
          {alert.status === 'open' && (
            <button
              onClick={() => onAcknowledge(alert.id)}
              disabled={isActing}
              className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              Acknowledge
            </button>
          )}
          {alert.status !== 'resolved' && (
            <button
              onClick={() => onResolve(alert.id)}
              disabled={isActing}
              className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              Mark Resolved
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function ComplianceClient() {
  const [statusFilter, setStatusFilter] = useState('')
  const [detailAlert, setDetailAlert] = useState<ComplianceAlert | null>(null)
  const { data, isLoading } = useComplianceAlerts(statusFilter || undefined)
  const acknowledge = useAcknowledgeAlert()

  const alerts = Array.isArray(data) ? data : []
  const open = alerts.filter(a => a.status === 'open').length

  async function handleAcknowledge(id: string) {
    try {
      await acknowledge.mutateAsync({ id, status: 'acknowledged' })
      toast.success('Alert acknowledged')
      setDetailAlert(null)
    } catch {
      toast.error('Failed to acknowledge alert')
    }
  }

  async function handleResolve(id: string) {
    try {
      await acknowledge.mutateAsync({ id, status: 'resolved' })
      toast.success('Alert resolved')
      setDetailAlert(null)
    } catch {
      toast.error('Failed to resolve alert')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Compliance Alerts</h1>
        <p className="text-sm text-text-muted mt-0.5">{open} open alert{open !== 1 ? 's' : ''} requiring attention</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open', value: open, icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Acknowledged', value: alerts.filter(a => a.status === 'acknowledged').length, icon: Eye, color: 'text-amber-600' },
          { label: 'Resolved', value: alerts.filter(a => a.status === 'resolved').length, icon: CheckCircle, color: 'text-green-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <p className={`text-2xl font-bold ${color}`}>{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative w-fit">
        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <select
          className="input pl-9 pr-8 appearance-none cursor-pointer"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="resolved">Resolved</option>
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Compliance Alerts</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : alerts.length === 0 ? (
          <LottieEmpty message="No compliance alerts" description="Alerts for below minimum wage or expired certificates appear here." />
        ) : (
          <div className="divide-y divide-border">
            {alerts.map(alert => (
              <div key={alert.id} className="flex items-center gap-4 px-4 py-3">
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <ShieldOff className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-text-primary">
                      {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${ALERT_TYPE_COLORS[alert.alert_type] ?? ''}`}>
                      {alert.alert_type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {formatDate(alert.created_at)}
                    {alert.employee_id && <> · Employee {String(alert.employee_id).slice(0, 8)}…</>}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[alert.status] ?? ''}`}>
                    {alert.status}
                  </span>
                  <button
                    onClick={() => setDetailAlert(alert)}
                    className="text-xs px-2.5 py-1.5 rounded-lg bg-surface-alt text-text-muted hover:text-text-primary border border-border transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DetailModal
        alert={detailAlert}
        onClose={() => setDetailAlert(null)}
        onAcknowledge={handleAcknowledge}
        onResolve={handleResolve}
        isActing={acknowledge.isPending}
      />
    </div>
  )
}

export { ComplianceClient as ComplianceAlertsClient }
