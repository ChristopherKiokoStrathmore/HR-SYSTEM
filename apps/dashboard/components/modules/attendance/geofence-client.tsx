'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { useStore } from '@/lib/store'
import {
  MapPin, Plus, Loader2, CircleDot, Trash2, RotateCcw,
  ChevronDown, Users, Building2, CheckSquare, Square, CheckCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

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

interface LatLng { lat: number; lng: number }

interface Employee {
  id: string
  employee_number: string
  job_title: string
  department: string
  employment_type: string
  user?: { full_name: string | null; email: string } | null
}

// ─── Kenyan cities ───────────────────────────────────────────────────────────

const KENYA_CITIES = [
  { name: 'Nairobi CBD', lat: -1.2921, lng: 36.8219 },
  { name: 'Westlands', lat: -1.2676, lng: 36.8111 },
  { name: 'Upperhill', lat: -1.2998, lng: 36.8174 },
  { name: 'Industrial Area', lat: -1.3086, lng: 36.8467 },
  { name: 'Karen', lat: -1.3211, lng: 36.7103 },
  { name: 'Thika Road', lat: -1.2195, lng: 36.8878 },
  { name: 'Mombasa CBD', lat: -4.0435, lng: 39.6682 },
  { name: 'Kisumu CBD', lat: -0.0917, lng: 34.7679 },
  { name: 'Nakuru CBD', lat: -0.3031, lng: 36.0800 },
  { name: 'Eldoret', lat: 0.5143, lng: 35.2698 },
  { name: 'Thika', lat: -1.0332, lng: 37.0693 },
  { name: 'Nyeri', lat: -0.4167, lng: 36.9500 },
  { name: 'Kisii', lat: -0.6817, lng: 34.7667 },
  { name: 'Machakos', lat: -1.5167, lng: 37.2636 },
  { name: 'Malindi', lat: -3.2138, lng: 40.1169 },
  { name: 'Garissa', lat: -0.4532, lng: 39.6461 },
  { name: 'Kitale', lat: 1.0154, lng: 35.0062 },
  { name: 'Meru', lat: 0.0471, lng: 37.6494 },
]

// ─── Zod schema ──────────────────────────────────────────────────────────────

const zoneSchema = z.object({
  name: z.string().min(2, 'Name required'),
  work_start: z.string().default('08:00'),
  work_end: z.string().default('17:00'),
  center_lat: z.coerce.number().min(-90).max(90),
  center_lng: z.coerce.number().min(-180).max(180),
  radius_m: z.coerce.number().min(20).max(50_000).default(200),
})
type ZoneForm = z.infer<typeof zoneSchema>

// ─── Map polygon picker ───────────────────────────────────────────────────────

function PolygonMapPicker({
  center,
  points,
  onChange,
}: {
  center: LatLng
  points: LatLng[]
  onChange: (pts: LatLng[]) => void
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const leafletRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polygonRef = useRef<any>(null)

  // Draw/update polygon and markers
  const redraw = useCallback((L: any, map: any, pts: LatLng[]) => {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    polygonRef.current?.remove()
    polygonRef.current = null

    pts.forEach((p, i) => {
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:24px;height:24px;background:#f97316;border:2px solid #fff;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;box-shadow:0 2px 4px rgba(0,0,0,.3)">${i + 1}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      })
      const m = L.marker([p.lat, p.lng], { icon }).addTo(map)
      markersRef.current.push(m)
    })

    if (pts.length >= 3) {
      polygonRef.current = L.polygon(
        pts.map(p => [p.lat, p.lng]),
        { color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15, weight: 2 }
      ).addTo(map)
    } else if (pts.length >= 2) {
      polygonRef.current = L.polyline(
        pts.map(p => [p.lat, p.lng]),
        { color: '#f97316', weight: 2, dashArray: '6 4' }
      ).addTo(map)
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    let map: any = null

    import('leaflet').then((L) => {
      if (!mapRef.current || leafletRef.current) return

      // Fix missing default icon images
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      map = L.map(mapRef.current, { zoomControl: true }).setView(
        [center.lat, center.lng], 14
      )
      leafletRef.current = map

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map)

      redraw(L, map, points)

      map.on('click', (e: any) => {
        onChange([...points, { lat: e.latlng.lat, lng: e.latlng.lng }])
      })
    })

    return () => {
      if (leafletRef.current) {
        leafletRef.current.remove()
        leafletRef.current = null
        markersRef.current = []
        polygonRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // mount once

  // Re-pan when city changes
  useEffect(() => {
    if (leafletRef.current) {
      leafletRef.current.setView([center.lat, center.lng], 14)
    }
  }, [center.lat, center.lng])

  // Redraw when points change
  useEffect(() => {
    if (!leafletRef.current) return
    import('leaflet').then((L) => {
      if (!leafletRef.current) return
      // Re-attach click with latest points
      leafletRef.current.off('click')
      redraw(L, leafletRef.current, points)
      leafletRef.current.on('click', (e: any) => {
        onChange([...points, { lat: e.latlng.lat, lng: e.latlng.lng }])
      })
    })
  }, [points, onChange, redraw])

  return (
    <div
      ref={mapRef}
      className="w-full rounded-xl overflow-hidden border border-border"
      style={{ height: 320 }}
    />
  )
}

// ─── Employee picker ──────────────────────────────────────────────────────────

function EmployeePicker({
  companyId,
  selected,
  onChange,
}: {
  companyId: string | null
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const [deptFilter, setDeptFilter] = useState<string>('all')

  const { data, isLoading } = useQuery({
    queryKey: ['employees-for-zone', companyId],
    queryFn: async () => {
      if (!companyId) return { data: [] as Employee[], count: 0 }
      const r = await fetch(`/api/employees?companyId=${companyId}&pageSize=200`)
      if (!r.ok) return { data: [] as Employee[], count: 0 }
      return r.json() as Promise<{ data: Employee[]; count: number }>
    },
    enabled: !!companyId,
  })

  const employees: Employee[] = data?.data ?? []
  const departments = ['all', ...Array.from(new Set(employees.map(e => e.department).filter(Boolean)))]

  const visible = deptFilter === 'all' ? employees : employees.filter(e => e.department === deptFilter)

  const allDeptSelected = visible.length > 0 && visible.every(e => selected.includes(e.id))
  const someDeptSelected = visible.some(e => selected.includes(e.id))

  const toggleDept = () => {
    if (allDeptSelected) {
      onChange(selected.filter(id => !visible.find(e => e.id === id)))
    } else {
      const toAdd = visible.map(e => e.id).filter(id => !selected.includes(id))
      onChange([...selected, ...toAdd])
    }
  }

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id])
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Building2 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <select
            className="input pl-8 text-sm"
            value={deptFilter}
            onChange={e => setDeptFilter(e.target.value)}
          >
            {departments.map(d => (
              <option key={d} value={d}>{d === 'all' ? 'All Departments' : d}</option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={toggleDept}
          className={cn(
            'flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors',
            allDeptSelected
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'border-border text-text-muted hover:border-primary/40'
          )}
        >
          {allDeptSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
          {allDeptSelected ? 'Deselect dept' : 'Select dept'}
        </button>
      </div>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center text-text-muted text-sm">
          <Loader2 className="w-4 h-4 animate-spin mr-2" /> Loading employees…
        </div>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-border divide-y divide-border">
          {visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-text-muted">No employees found</p>
          ) : (
            visible.map(emp => {
              const isSelected = selected.includes(emp.id)
              return (
                <label
                  key={emp.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors hover:bg-surface-alt',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggle(emp.id)}
                    className="rounded accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {emp.user?.full_name ?? emp.employee_number}
                    </p>
                    <p className="text-xs text-text-muted truncate">
                      {emp.job_title}{emp.department ? ` · ${emp.department}` : ''}
                      {emp.employment_type === 'casual' && (
                        <span className="ml-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">casual</span>
                      )}
                    </p>
                  </div>
                </label>
              )
            })
          )}
        </div>
      )}

      {selected.length > 0 && (
        <p className="text-xs text-primary font-medium">
          {selected.length} employee{selected.length !== 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}

// ─── Add Zone Modal ───────────────────────────────────────────────────────────

function AddZoneModal({
  open,
  companyId,
  onClose,
}: {
  open: boolean
  companyId: string | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const [polygonPoints, setPolygonPoints] = useState<LatLng[]>([])
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([])
  const [citySearch, setCitySearch] = useState('')
  const [showCityDropdown, setShowCityDropdown] = useState(false)
  const [mapCenter, setMapCenter] = useState<LatLng>(KENYA_CITIES[0])

  const { register, handleSubmit, reset, setValue, watch, control, formState: { errors, isSubmitting } } = useForm<ZoneForm>({
    resolver: zodResolver(zoneSchema),
    defaultValues: {
      radius_m: 200,
      work_start: '08:00',
      work_end: '17:00',
      center_lat: KENYA_CITIES[0].lat,
      center_lng: KENYA_CITIES[0].lng,
    },
  })

  // Reset when modal opens/closes
  useEffect(() => {
    if (!open) {
      reset()
      setPolygonPoints([])
      setSelectedEmployees([])
      setCitySearch('')
      setMapCenter(KENYA_CITIES[0])
    }
  }, [open, reset])

  const filteredCities = KENYA_CITIES.filter(c =>
    c.name.toLowerCase().includes(citySearch.toLowerCase())
  )

  const selectCity = (city: typeof KENYA_CITIES[0]) => {
    setValue('name', city.name)
    setValue('center_lat', city.lat)
    setValue('center_lng', city.lng)
    setMapCenter({ lat: city.lat, lng: city.lng })
    setCitySearch(city.name)
    setShowCityDropdown(false)
    setPolygonPoints([]) // reset polygon when city changes
  }

  // Compute polygon centroid for center_lat/lng when polygon is complete
  useEffect(() => {
    if (polygonPoints.length >= 3) {
      const lat = polygonPoints.reduce((s, p) => s + p.lat, 0) / polygonPoints.length
      const lng = polygonPoints.reduce((s, p) => s + p.lng, 0) / polygonPoints.length
      setValue('center_lat', parseFloat(lat.toFixed(6)))
      setValue('center_lng', parseFloat(lng.toFixed(6)))
    }
  }, [polygonPoints, setValue])

  const create = useMutation({
    mutationFn: async (body: ZoneForm) => {
      const payload: Record<string, unknown> = {
        ...body,
        company_id: companyId,
      }
      if (polygonPoints.length >= 3) {
        payload.polygon_points = polygonPoints
      }

      const res = await fetch('/api/hr/work-zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create zone')
      return res.json() as Promise<{ id: string }>
    },
    onSuccess: async (zone) => {
      // Assign selected employees
      if (selectedEmployees.length > 0) {
        await fetch(`/api/hr/work-zones/${zone.id}/assign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_ids: selectedEmployees }),
        })
      }
      qc.invalidateQueries({ queryKey: ['work-zones'] })
      toast.success(`Work zone created${selectedEmployees.length > 0 ? ` · ${selectedEmployees.length} employees assigned` : ''}`)
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const pointStatus = polygonPoints.length === 0
    ? 'Click the map to place 4 boundary points'
    : polygonPoints.length < 4
      ? `${polygonPoints.length}/4 points placed — ${4 - polygonPoints.length} more needed`
      : `${polygonPoints.length} points set — polygon complete`

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New Work Zone"
      description="Define the boundary, assign employees or entire departments"
      size="xl"
    >
      <form onSubmit={handleSubmit(v => create.mutateAsync(v))} className="space-y-6">

        {/* ── Section 1: Zone details ─────────────────────────────────── */}
        <div className="space-y-4">
          <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            Zone Details
          </h3>

          {/* City quick-select */}
          <div className="relative">
            <label className="block text-sm font-medium text-text-body mb-1.5">
              Zone Name / Location *
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input
                className="input pl-9 pr-9"
                placeholder="Search Kenyan city or type custom name…"
                value={citySearch}
                onChange={e => {
                  setCitySearch(e.target.value)
                  setValue('name', e.target.value)
                  setShowCityDropdown(true)
                }}
                onFocus={() => setShowCityDropdown(true)}
                onBlur={() => setTimeout(() => setShowCityDropdown(false), 150)}
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            </div>
            {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}

            {showCityDropdown && filteredCities.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-surface border border-border rounded-xl shadow-lg overflow-hidden max-h-56 overflow-y-auto">
                {filteredCities.map(city => (
                  <button
                    key={city.name}
                    type="button"
                    onMouseDown={() => selectCity(city)}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-surface-alt flex items-center gap-2 transition-colors"
                  >
                    <MapPin className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                    <span className="font-medium">{city.name}</span>
                    <span className="text-text-muted text-xs ml-auto">{city.lat.toFixed(4)}, {city.lng.toFixed(4)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Work hours */}
          <div className="grid grid-cols-2 gap-4">
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

        {/* ── Section 2: Map polygon picker ──────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Boundary (4-Point Polygon)
            </h3>
            {polygonPoints.length > 0 && (
              <button
                type="button"
                onClick={() => setPolygonPoints([])}
                className="flex items-center gap-1 text-xs text-text-muted hover:text-danger transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Reset
              </button>
            )}
          </div>

          <div className={cn(
            'text-xs px-3 py-1.5 rounded-lg font-medium',
            polygonPoints.length >= 4
              ? 'bg-green-50 text-green-700 border border-green-200'
              : polygonPoints.length > 0
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-surface-alt text-text-muted border border-border'
          )}>
            {pointStatus}
          </div>

          <PolygonMapPicker
            center={mapCenter}
            points={polygonPoints}
            onChange={setPolygonPoints}
          />

          {polygonPoints.length >= 4 && (
            <div className="flex flex-wrap gap-2">
              {polygonPoints.map((p, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs bg-surface-alt border border-border rounded-lg px-2.5 py-1">
                  <span className="w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">{i + 1}</span>
                  {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                  <button
                    type="button"
                    onClick={() => setPolygonPoints(polygonPoints.filter((_, j) => j !== i))}
                    className="text-text-muted hover:text-danger transition-colors ml-0.5"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Section 3: Employee assignment ─────────────────────────── */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Assign Employees
            </h3>
            <Users className="w-3.5 h-3.5 text-text-muted" />
            <span className="text-xs text-text-muted">(optional — can assign later)</span>
          </div>
          <EmployeePicker
            companyId={companyId}
            selected={selectedEmployees}
            onChange={setSelectedEmployees}
          />
        </div>

        {/* ── Actions ─────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-2 border-t border-border">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button
            type="submit"
            disabled={isSubmitting || polygonPoints.length < 4}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
            title={polygonPoints.length < 4 ? 'Place 4 points on the map first' : ''}
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            {polygonPoints.length < 4
              ? `Place ${4 - polygonPoints.length} more point${4 - polygonPoints.length !== 1 ? 's' : ''}`
              : 'Create Zone'}
          </button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────

const COLOR_STYLES: Record<string, string> = {
  green: 'text-green-600',
  red: 'text-red-600',
  grey: 'text-gray-400',
}

// ─── Violations panel ─────────────────────────────────────────────────────────

function ViolationsPanel({ companyId }: { companyId: string | null }) {
  const qc = useQueryClient()
  const { data, isLoading } = useQuery({
    queryKey: ['geofence-violations', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/hr/geofence-violations?company_id=${companyId}`)
      if (!res.ok) return []
      return res.json() as Promise<Violation[]>
    },
    enabled: !!companyId,
  })

  const violations: Violation[] = Array.isArray(data) ? data : []
  const open = violations.filter(v => v.status === 'open').length

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/hr/geofence-violations/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'resolved', ended_at: new Date().toISOString() }),
      })
      if (!res.ok) throw new Error('Failed to resolve')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['geofence-violations'] }),
  })

  const STATUS_STYLES: Record<string, string> = {
    open: 'bg-red-50 text-red-700 border-red-200',
    reason_submitted: 'bg-amber-50 text-amber-700 border-amber-200',
    resolved: 'bg-green-50 text-green-700 border-green-200',
  }

  if (isLoading) return <SkeletonTable rows={4} />

  if (violations.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <CheckCircle className="w-10 h-10 text-green-300" />
        <p className="text-text-muted text-sm">No geofence violations recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-text-muted px-1">{open} open violation{open !== 1 ? 's' : ''}</p>
      <div className="card p-0 overflow-hidden">
        <div className="divide-y divide-border">
          {violations.map(v => (
            <div key={v.id} className="flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-text-primary">
                    {String(v.employee_id).slice(0, 8)}…
                  </p>
                  <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', STATUS_STYLES[v.status] ?? '')}>
                    {v.status.replace('_', ' ')}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Started {new Date(v.started_at).toLocaleString()}
                  {v.distance_m != null && <> · {Math.round(v.distance_m)}m from zone</>}
                  {v.reason && <> · <span className="italic">"{v.reason}"</span></>}
                </p>
              </div>
              {v.status !== 'resolved' && (
                <button
                  onClick={() => resolve.mutate(v.id)}
                  disabled={resolve.isPending}
                  className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-green-50 text-green-700 hover:bg-green-100 transition-colors disabled:opacity-50 flex-shrink-0"
                >
                  <CheckCircle className="w-3.5 h-3.5" /> Resolve
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function GeofenceClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [modal, setModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'live' | 'violations'>('live')

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
            Live zone status from PWA check-ins — polygon boundaries, per-employee assignment
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Work Zone
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'In zone', value: inZone, color: 'text-green-600' },
          { label: 'Out of zone', value: outZone, color: 'text-red-600' },
          { label: 'Open violations', value: violations.length, color: 'text-amber-600' },
          {
            label: 'Attendance today',
            value: rateData?.rate != null ? `${rateData.rate}%` : '—',
            color: rateData?.rate < 30 ? 'text-red-600' : 'text-text-primary',
          },
        ].map(stat => (
          <div key={stat.label} className="card p-4">
            <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
            <p className="text-xs text-text-muted">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-surface-alt rounded-xl w-fit border border-border">
        {(['live', 'violations'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'text-xs font-medium px-4 py-1.5 rounded-lg transition-colors capitalize',
              activeTab === tab
                ? 'bg-surface text-text-primary shadow-sm'
                : 'text-text-muted hover:text-text-primary'
            )}
          >
            {tab === 'live' ? 'Live Status' : 'Violations'}
            {tab === 'violations' && violations.length > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-bold">
                {violations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'live' && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-text-primary">Employee Zone Status (last 12h)</h3>
          </div>
          {isLoading ? (
            <SkeletonTable rows={6} />
          ) : employees.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16">
              <MapPin className="w-12 h-12 text-border" />
              <p className="text-text-muted text-sm">No location signals yet — create a zone and assign employees.</p>
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
                  <span className={cn(
                    'text-xs px-2 py-0.5 rounded-full border',
                    e.color === 'green' ? 'bg-green-50 text-green-700 border-green-200'
                      : e.color === 'red' ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-gray-50 text-gray-500 border-gray-200'
                  )}>
                    {e.color === 'green' ? 'in zone' : e.color === 'red' ? 'out of zone' : 'no signal'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'violations' && (
        <ViolationsPanel companyId={activeCompanyId} />
      )}

      <AddZoneModal
        open={modal}
        companyId={activeCompanyId}
        onClose={() => setModal(false)}
      />
    </div>
  )
}
