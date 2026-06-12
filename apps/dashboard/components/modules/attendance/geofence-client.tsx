'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { useStore } from '@/lib/store'
import { MapPin, Plus, Loader2, CircleDot } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * HQ-only geofence dashboard (01-Jun session): color-coded zone status per
 * employee — green in zone, red out of zone (with submitted reason), grey no
 * signal. Employees never see this view; the backend 403s non-HQ roles and
 * the PWA only ever receives the employee's own "reason_required" flag.
 */

interface ZoneStatus {
  employee_id: string
  color: 'green' | 'red' | 'grey'
  last_seen: string
  event_type: string
  in_zone: boolean | null
  reason: string
}

interface Violation {
  id: string
  employee_id: string
  started_at: string
  reason: string
  status: string
  distance_m: number | null
}

const zoneSchema = z.object({
  name: z.string().min(2, 'Name required'),
  center_lat: z.coerce.number().min(-90).max(90),
  center_lng: z.coerce.number().min(-180).max(180),
  radius_m: z.coerce.number().min(20).max(50_000).default(200),
  work_start: z.string().default('08:00'),
  work_end: z.string().default('17:00'),
})
type ZoneForm = z.infer<typeof zoneSchema>

const COLOR_STYLES: Record<string, string> = {
  green: 'text-green-600',
  red: 'text-red-600',
  grey: 'text-gray-400',
}

function AddZoneModal({ open, companyId, onClose }: { open: boolean; companyId: string | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ZoneForm>({
    resolver: zodResolver(zoneSchema),
    defaultValues: { radius_m: 200, work_start: '08:00', work_end: '17:00' },
  })

  const create = useMutation({
    mutationFn: async (body: ZoneForm) => {
      const res = await fetch('/api/hr/work-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, company_id: companyId }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create zone')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['work-zones'] })
      toast.success('Work zone created')
      reset()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open={open} onClose={onClose} title="New Work Zone" size="md">
      <form onSubmit={handleSubmit(v => create.mutateAsync(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Zone Name *</label>
          <input className="input" placeholder="HQ Nairobi / Site B" {...register('name')} />
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Center latitude *</label>
            <input type="number" step="any" className="input" placeholder="-1.2864" {...register('center_lat')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Center longitude *</label>
            <input type="number" step="any" className="input" placeholder="36.8172" {...register('center_lng')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Radius (meters)</label>
            <input type="number" className="input" {...register('radius_m')} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Work start</label>
              <input type="time" className="input" {...register('work_start')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-body mb-1.5">Work end</label>
              <input type="time" className="input" {...register('work_end')} />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Create Zone
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function GeofenceClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [modal, setModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['geofence-dashboard', activeCompanyId],
    queryFn: async () => {
      const res = await fetch(`/api/hr/geofence/dashboard?company_id=${activeCompanyId}`)
      if (!res.ok) return { employees: [], open_violations: [] }
      return res.json() as Promise<{ employees: ZoneStatus[]; open_violations: Violation[] }>
    },
    enabled: !!activeCompanyId,
    refetchInterval: 60 * 1000,
  })

  const { data: rateData } = useQuery({
    queryKey: ['attendance-rate', activeCompanyId],
    queryFn: async () => (await fetch(`/api/hr/attendance/rate?company_id=${activeCompanyId}`)).json(),
    enabled: !!activeCompanyId,
    refetchInterval: 5 * 60 * 1000,
  })

  const employees = data?.employees ?? []
  const violations = data?.open_violations ?? []
  const inZone = employees.filter(e => e.color === 'green').length
  const outZone = employees.filter(e => e.color === 'red').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Geofence Monitor</h1>
          <p className="text-sm text-text-muted mt-0.5">
            HQ-only view — live zone status from PWA check-ins and pings
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Work Zone
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'In zone', value: inZone, color: 'text-green-600' },
          { label: 'Out of zone', value: outZone, color: 'text-red-600' },
          { label: 'Open violations', value: violations.length, color: 'text-amber-600' },
          { label: 'Attendance today', value: rateData?.rate != null ? `${rateData.rate}%` : '—', color: rateData?.rate < 30 ? 'text-red-600' : 'text-text-primary' },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-xs text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Employee Zone Status (last 12h)</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <MapPin className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No location signals yet. Assign employees to a work zone.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {employees.map(e => (
              <div key={e.employee_id} className="flex items-center gap-4 px-4 py-3">
                <CircleDot className={cn('w-4 h-4 flex-shrink-0', COLOR_STYLES[e.color])} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{e.employee_id.slice(0, 8)}…</p>
                  <p className="text-xs text-text-muted">
                    {e.event_type.replace('_', ' ')} · {new Date(e.last_seen).toLocaleTimeString()}
                    {e.color === 'red' && (e.reason ? ` · reason: ${e.reason}` : ' · no reason submitted')}
                  </p>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border',
                  e.color === 'green' ? 'bg-green-50 text-green-700 border-green-200'
                    : e.color === 'red' ? 'bg-red-50 text-red-700 border-red-200'
                    : 'bg-gray-50 text-gray-500 border-gray-200')}>
                  {e.color === 'green' ? 'in zone' : e.color === 'red' ? 'out of zone' : 'no signal'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddZoneModal open={modal} companyId={activeCompanyId} onClose={() => setModal(false)} />
    </div>
  )
}
