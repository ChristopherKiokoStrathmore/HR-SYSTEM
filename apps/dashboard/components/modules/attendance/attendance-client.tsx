'use client'

import { useState } from 'react'
import { useAttendanceSummary } from '@/lib/hooks/use-attendance'
import { Avatar } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/badge'
import { SkeletonTable } from '@/components/ui/skeleton'
import { useStore } from '@/lib/store'
import { formatDate } from '@hr/shared'
import { Calendar, MapPin, Users, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AttendanceClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))

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
          <p className="text-sm text-text-muted mt-0.5">{formatDate(date)}</p>
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

      {/* Map placeholder */}
      <div className="card">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-semibold text-text-primary">Check-in Locations</h3>
          <span className="ml-auto text-xs text-text-muted">GPS tracking active</span>
        </div>
        <div className="rounded-xl bg-surface-alt border border-border flex items-center justify-center" style={{ height: 280 }}>
          <div className="text-center">
            <MapPin className="w-12 h-12 text-border mx-auto mb-3" />
            <p className="text-sm font-medium text-text-muted">Live GPS Map</p>
            <p className="text-xs text-text-muted mt-1">Connect Google Maps API to enable real-time location tracking</p>
            {records.filter(r => r.check_in_lat).length > 0 && (
              <p className="text-xs text-accent mt-2">
                {records.filter(r => r.check_in_lat).length} location{records.filter(r => r.check_in_lat).length !== 1 ? 's' : ''} recorded today
              </p>
            )}
          </div>
        </div>
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
            <p className="text-text-muted text-sm">No attendance records for {formatDate(date)}.</p>
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
                  <Avatar name={name} src={rec.employee?.user?.avatar_url ?? undefined} size="sm" />
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
                  <StatusBadge status={rec.status} />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
