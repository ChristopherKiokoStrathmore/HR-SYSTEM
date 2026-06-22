'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAttendanceSummary, useAttendanceLocations } from '@/lib/hooks/use-attendance'
import { SkeletonTable } from '@/components/ui/skeleton'
import { useStore } from '@/lib/store'
import { Calendar, MapPin, Users, Clock, AlertCircle, RefreshCw, Navigation, Printer, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CheckInLocation } from './check-in-map'

const CheckInMap = dynamic(
  () => import('./check-in-map').then(m => ({ default: m.CheckInMap })),
  { ssr: false, loading: () => <div className="rounded-xl bg-surface-alt border border-border" style={{ height: 320 }} /> }
)

function formatDisplayDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase() ?? '')
      .join('') || '?'
  )
}

function getStatusMeta(status: string) {
  switch (status) {
    case 'present':
      return { label: 'Present', className: 'bg-green-50 text-green-700 border-green-200' }
    case 'absent':
      return { label: 'Absent', className: 'bg-red-50 text-red-700 border-red-200' }
    case 'half_day':
      return { label: 'Half Day', className: 'bg-amber-50 text-amber-700 border-amber-200' }
    default:
      return { label: status, className: 'bg-surface-alt text-text-muted border-border' }
  }
}

export function AttendanceClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' }))

  const { data, isLoading, refetch, isFetching } = useAttendanceSummary(activeCompanyId, date)
  const { data: locData } = useAttendanceLocations(activeCompanyId, date)

  const records = data?.data ?? []
  const stats = data?.stats ?? { present: 0, absent: 0, late: 0, total: 0 }
  const checkedIn = stats.present + stats.late
  const absent = stats.total > 0 ? stats.total - checkedIn : stats.absent
  const attendanceRate = stats.total > 0 ? Math.round((checkedIn / stats.total) * 100) : 0

  function handleShareReport() {
    const title = document.title
    document.title = `Attendance Report — ${formatDisplayDate(date)}`
    window.print()
    document.title = title
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Attendance</h1>
          <p className="text-sm text-text-muted mt-0.5">{formatDisplayDate(date)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Calendar className="w-4 h-4 text-text-muted" />
          <input
            type="date"
            className="input"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-surface-alt"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleShareReport}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-light"
          >
            <Printer className="w-3.5 h-3.5" />
            Share Report
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Present', value: stats.present, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle2 },
          { label: 'Late Arrivals', value: stats.late, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: 'Absent', value: absent, color: 'text-red-600', bg: 'bg-red-50', icon: XCircle },
          { label: "Today's Rate", value: `${attendanceRate}%`, color: 'text-primary', bg: 'bg-primary/5', icon: Users },
        ].map(({ label, value, color, bg, icon: Icon }) => (
          <div key={label} className="card flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0', bg)}>
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Today's attendance rate bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">Today's Attendance Rate</p>
            <p className="text-xs text-text-muted mt-0.5">{stats.present} on time · {stats.late} late · {absent} absent · {stats.total} total</p>
          </div>
          <span className={cn(
            'text-2xl font-bold',
            attendanceRate >= 90 ? 'text-green-600' :
            attendanceRate >= 75 ? 'text-amber-600' : 'text-red-600'
          )}>
            {attendanceRate}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-border overflow-hidden flex">
          <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${stats.total > 0 ? (stats.present / stats.total) * 100 : 0}%` }} />
          <div className="h-full bg-amber-400 transition-all duration-500" style={{ width: `${stats.total > 0 ? (stats.late / stats.total) * 100 : 0}%` }} />
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted mt-2">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />On time</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Late</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-border inline-block" />Absent</span>
        </div>
      </div>

      {/* Check-in Map — uses tenant-wide locations so sister-company check-ins are visible */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Check-in Locations</h3>
          <span className="ml-auto text-xs text-text-muted">
            {(() => {
              const n = locData?.data?.length ?? 0
              return n > 0 ? `${n} GPS check-in${n !== 1 ? 's' : ''} today` : 'OpenStreetMap · no API key needed'
            })()}
          </span>
        </div>
        {(() => {
          const locs: CheckInLocation[] = (locData?.data ?? []).map(r => ({
            lat: r.check_in_lat as number,
            lng: r.check_in_lng as number,
            name: r.employee_name ?? '—',
            time: r.check_in_time
              ? new Date(r.check_in_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
              : null,
            status: r.status ?? 'unknown',
            is_late: r.is_late ?? undefined,
          }))
          if (locs.length === 0) {
            return (
              <div className="rounded-xl bg-surface-alt border border-border flex items-center justify-center" style={{ height: 320 }}>
                <div className="text-center">
                  <MapPin className="w-10 h-10 text-border mx-auto mb-2" />
                  <p className="text-sm text-text-muted">No GPS check-ins recorded for {formatDisplayDate(date)}</p>
                  <p className="text-xs text-text-muted mt-1">Employees check in via the PWA mobile app</p>
                </div>
              </div>
            )
          }
          return <CheckInMap locations={locs} />
        })()}
      </div>

      {/* Records table */}
      <div className="card p-0 overflow-hidden print:shadow-none">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h3 className="text-sm font-semibold text-text-primary">Today's Records</h3>
          {records.length > 0 && (
            <span className="text-xs text-text-muted">{records.length} employee{records.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isLoading ? (
          <SkeletonTable rows={8} />
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Users className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No attendance records for {formatDisplayDate(date)}.</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-4 px-4 py-2 bg-surface-alt text-xs font-semibold text-text-muted uppercase tracking-wide">
              <span>Employee</span>
              <span>Check In</span>
              <span>Check Out</span>
              <span>Status</span>
              <span>Reason / Notes</span>
            </div>
            <div className="divide-y divide-border">
              {records.map((rec) => {
                const name = rec.employee?.user?.full_name ?? '—'
                const checkIn = rec.check_in_time
                  ? new Date(rec.check_in_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                  : null
                const checkOut = rec.check_out_time
                  ? new Date(rec.check_out_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                  : null
                const notes = (rec as unknown as Record<string, unknown>).notes as string | undefined

                return (
                  <div key={rec.id} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_1.5fr] gap-2 md:gap-4 px-4 py-3 items-center">
                    {/* Employee */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                        {getInitials(name)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{name}</p>
                        <p className="text-xs text-text-muted truncate">
                          {rec.employee?.job_title}
                          {rec.employee?.department && <> · {rec.employee.department}</>}
                        </p>
                      </div>
                    </div>

                    {/* Check in */}
                    <div className="text-sm">
                      {checkIn ? (
                        <div>
                          <span className={cn('font-medium', rec.is_late ? 'text-amber-600' : 'text-green-600')}>
                            {checkIn}
                          </span>
                          {rec.is_late && <span className="ml-1 text-xs text-amber-500">(late)</span>}
                          {rec.check_in_lat != null && rec.check_in_lng != null && (
                            <span className="ml-1 text-green-500 text-xs" title="GPS check-in"><Navigation className="w-3 h-3 inline" /></span>
                          )}
                        </div>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </div>

                    {/* Check out */}
                    <div className="text-sm">
                      {checkOut ? (
                        <span className="text-text-body font-medium">{checkOut}</span>
                      ) : (
                        <span className="text-text-muted text-xs">—</span>
                      )}
                    </div>

                    {/* Status */}
                    <div>
                      <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', getStatusMeta(rec.status).className)}>
                        {getStatusMeta(rec.status).label}
                      </span>
                    </div>

                    {/* Reason / Notes */}
                    <div className="text-xs text-text-muted italic">
                      {notes ? (
                        <span className="text-text-body not-italic">{notes}</span>
                      ) : rec.status === 'absent' ? (
                        <span className="text-red-400">No reason provided</span>
                      ) : (
                        <span>—</span>
                      )}
                      {rec.distance_covered_km != null && rec.distance_covered_km > 0 && (
                        <span className="ml-2 not-italic text-text-muted">
                          <MapPin className="w-3 h-3 inline mr-0.5" />{rec.distance_covered_km.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
