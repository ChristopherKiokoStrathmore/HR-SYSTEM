'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useAttendanceSummary } from '@/lib/hooks/use-attendance'
import { SkeletonTable } from '@/components/ui/skeleton'
import { useStore } from '@/lib/store'
import { Calendar, MapPin, Users, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CheckInLocation } from './check-in-map'

const CheckInMap = dynamic(
  () => import('./check-in-map').then(m => ({ default: m.CheckInMap })),
  { ssr: false, loading: () => <div className="rounded-xl bg-surface-alt border border-border" style={{ height: 280 }} /> }
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

  const { data, isLoading } = useAttendanceSummary(activeCompanyId, date)

  const records = data?.data ?? []
  const stats = data?.stats ?? { present: 0, absent: 0, late: 0, total: 0 }
  const attendanceRate = stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Attendance</h1>
          <p className="text-sm text-text-muted mt-0.5">{formatDisplayDate(date)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-text-muted" />
          <input
            type="date"
            className="input"
            value={date}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Present', value: stats.present, color: 'text-green-600', bg: 'bg-green-50', icon: Users },
          { label: 'Absent', value: stats.absent, color: 'text-red-600', bg: 'bg-red-50', icon: AlertCircle },
          { label: 'Late Arrivals', value: stats.late, color: 'text-amber-600', bg: 'bg-amber-50', icon: Clock },
          { label: 'Attendance Rate', value: `${attendanceRate}%`, color: 'text-primary', bg: 'bg-primary/5', icon: Users },
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

      {/* Attendance rate bar */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-text-primary">Attendance Rate</p>
          <span className={cn(
            'text-sm font-bold',
            attendanceRate >= 90 ? 'text-green-600' :
            attendanceRate >= 75 ? 'text-amber-600' : 'text-red-600'
          )}>
            {attendanceRate}%
          </span>
        </div>
        <div className="h-3 rounded-full bg-border overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              attendanceRate >= 90 ? 'bg-green-500' :
              attendanceRate >= 75 ? 'bg-amber-500' : 'bg-red-500'
            )}
            style={{ width: `${attendanceRate}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-text-muted mt-1">
          <span>{stats.present} present</span>
          <span>{stats.absent} absent</span>
        </div>
      </div>

      {/* Check-in Map */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Check-in Locations</h3>
          <span className="ml-auto text-xs text-text-muted">
            {(() => {
              const n = records.filter(r => r.check_in_lat).length
              return n > 0 ? `${n} location${n !== 1 ? 's' : ''} today` : 'OpenStreetMap · no API key needed'
            })()}
          </span>
        </div>
        {(() => {
          const locs: CheckInLocation[] = records
            .filter(r => r.check_in_lat && r.check_in_lng)
            .map(r => ({
              lat: r.check_in_lat as number,
              lng: r.check_in_lng as number,
              name: r.employee?.user?.full_name ?? '—',
              time: r.check_in_time
                ? new Date(r.check_in_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                : null,
              status: r.status,
            }))
          if (locs.length === 0) {
            return (
              <div className="rounded-xl bg-surface-alt border border-border flex items-center justify-center" style={{ height: 280 }}>
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
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Today's Records</h3>
        </div>

        {isLoading ? (
          <SkeletonTable rows={8} />
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Users className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No attendance records for {formatDisplayDate(date)}.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {records.map((rec) => {
              const name = rec.employee?.user?.full_name ?? '—'
              const checkIn = rec.check_in_time
                ? new Date(rec.check_in_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                : null
              const checkOut = rec.check_out_time
                ? new Date(rec.check_out_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                : null

              return (
                <div key={rec.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                    {getInitials(name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{name}</p>
                    <p className="text-xs text-text-muted">
                      {rec.employee?.job_title}
                      {rec.employee?.department && <> · {rec.employee.department}</>}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3 text-xs text-text-muted">
                      {checkIn ? (
                        <span className={rec.is_late ? 'text-amber-600 font-medium' : ''}>
                          In: {checkIn}{rec.is_late ? ' (late)' : ''}
                        </span>
                      ) : (
                        <span className="text-text-muted">Not checked in</span>
                      )}
                      {checkOut && <span>Out: {checkOut}</span>}
                      {rec.distance_covered_km != null && rec.distance_covered_km > 0 && (
                        <span className="flex items-center gap-0.5">
                          <MapPin className="w-3 h-3" />{rec.distance_covered_km.toFixed(1)} km
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium', getStatusMeta(rec.status).className)}>
                    {getStatusMeta(rec.status).label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
