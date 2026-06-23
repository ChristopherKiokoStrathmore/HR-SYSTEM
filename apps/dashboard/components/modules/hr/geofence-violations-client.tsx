'use client'
import { useState } from 'react'
import { useGeofenceViolations, useResolveViolation } from '@/lib/hooks/use-geofence'
import { Avatar } from '@/components/ui/avatar'
import { SkeletonTable } from '@/components/ui/skeleton'
import { LottieEmpty } from '@/components/ui/lottie-empty'
import { toast } from '@/lib/toast'
import { formatDate } from '@hr/shared'
import { AlertTriangle, CheckCircle, ChevronDown } from 'lucide-react'

export function GeofenceViolationsClient() {
  const { data: violations, isLoading } = useGeofenceViolations('open')
  const resolve = useResolveViolation()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reasonInput, setReasonInput] = useState<Record<string, string>>({})

  const handleResolve = async (id: string) => {
    const reason = reasonInput[id]
    if (!reason?.trim()) {
      toast.error('Please enter a reason')
      return
    }
    try {
      await resolve.mutateAsync({ id, reason })
      setReasonInput(prev => {
        const next = { ...prev }
        delete next[id]
        return next
      })
      setExpandedId(null)
      toast.success('Violation resolved')
    } catch {
      toast.error('Failed to resolve violation')
    }
  }

  if (isLoading) return <SkeletonTable rows={5} />
  if (!violations?.length) return <LottieEmpty message="No active geofence violations" />

  return (
    <div className="space-y-3">
      {violations.map(v => (
        <div
          key={v.id}
          className="rounded-lg border border-border bg-surface overflow-hidden"
        >
          <button
            onClick={() => setExpandedId(expandedId === v.id ? null : v.id)}
            className="w-full p-4 flex items-center justify-between hover:bg-surface-alt"
          >
            <div className="flex items-center gap-3 flex-1">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <div className="text-left">
                <p className="font-medium text-text-primary">{v.employee_name}</p>
                <p className="text-xs text-text-muted">
                  {v.zone_name} • {v.distance_m}m away
                </p>
              </div>
            </div>
            <span className="text-xs text-amber-600 font-medium">{formatDate(v.started_at)}</span>
            <ChevronDown
              className={`w-4 h-4 transition ${expandedId === v.id ? 'rotate-180' : ''}`}
            />
          </button>

          {expandedId === v.id && (
            <div className="border-t border-border p-4 space-y-3 bg-surface-alt">
              <div className="text-sm">
                <p className="text-text-muted">Duration: {v.ended_at ? 'Resolved' : 'Ongoing'}</p>
                <p className="text-text-muted mt-1">Distance: {v.distance_m}m from zone</p>
              </div>
              <div>
                <label className="text-sm text-text-muted block mb-2">Resolution reason:</label>
                <textarea
                  placeholder="e.g., Employee was on approved errand..."
                  value={reasonInput[v.id] || ''}
                  onChange={e => setReasonInput(prev => ({ ...prev, [v.id]: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-border text-sm h-20"
                />
              </div>
              <button
                onClick={() => handleResolve(v.id)}
                disabled={resolve.isPending}
                className="w-full px-3 py-2 rounded-lg bg-green-600 text-white text-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <CheckCircle className="w-4 h-4" /> Mark Resolved
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
