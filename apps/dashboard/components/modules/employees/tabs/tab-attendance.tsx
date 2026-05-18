'use client'

import { useQuery } from '@tanstack/react-query'
import { SkeletonTable } from '@/components/ui/skeleton'
import { StatusBadge } from '@/components/ui/badge'
import { formatDate } from '@hr/shared'
import type { Attendance } from '@hr/shared'

export function TabAttendance({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['attendance', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/attendance?employeeId=${employeeId}&limit=30`)
      return res.json() as Promise<{ data: Attendance[] }>
    },
  })

  const records = data?.data ?? []
  const presentCount = records.filter((r) => r.status === 'present').length
  const lateCount = records.filter((r) => r.is_late).length

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Present (30d)', value: presentCount, color: 'text-success' },
          { label: 'Late', value: lateCount, color: 'text-warning' },
          { label: 'Absent', value: records.filter((r) => r.status === 'absent').length, color: 'text-danger' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-text-muted mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Records table */}
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Recent Attendance (Last 30 days)</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : records.length === 0 ? (
          <p className="text-text-muted text-sm p-6 text-center">No attendance records.</p>
        ) : (
          <div className="divide-y divide-border">
            {records.map((rec) => (
              <div key={rec.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-text-primary">{formatDate(rec.shift_date)}</p>
                  <p className="text-xs text-text-muted">
                    {rec.check_in_time
                      ? new Date(rec.check_in_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                    {' → '}
                    {rec.check_out_time
                      ? new Date(rec.check_out_time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
                      : '—'}
                    {rec.distance_covered_km != null && ` · ${rec.distance_covered_km.toFixed(1)} km`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {rec.is_late && <span className="text-xs text-warning font-medium">Late</span>}
                  <StatusBadge status={rec.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
