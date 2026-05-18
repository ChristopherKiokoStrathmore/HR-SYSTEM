'use client'

import { useQuery } from '@tanstack/react-query'
import { SkeletonTable } from '@/components/ui/skeleton'
import { formatDate } from '@hr/shared'
import type { TrainingSession } from '@hr/shared'
import { BookOpen, Clock, User } from 'lucide-react'

interface TrainingWithAttendance extends TrainingSession {
  attendance_status: 'enrolled' | 'attended' | 'completed' | 'absent' | 'cancelled'
  score: number | null
  certificate_url: string | null
}

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-50 text-green-700',
  attended: 'bg-blue-50 text-blue-700',
  enrolled: 'bg-accent/10 text-accent',
  absent: 'bg-red-50 text-red-700',
  cancelled: 'bg-surface text-text-muted',
}

export function TabTraining({ employeeId }: { employeeId: string; companyId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['training-sessions', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/training?employeeId=${employeeId}`)
      return res.json() as Promise<{ data: TrainingWithAttendance[] }>
    },
  })

  const sessions = data?.data ?? []
  const completed = sessions.filter(s => s.attendance_status === 'completed').length
  const enrolled = sessions.filter(s => s.attendance_status === 'enrolled').length

  return (
    <div className="space-y-4">
      {sessions.length > 0 && (
        <div className="flex gap-3">
          <div className="card px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold text-text-primary">{sessions.length}</p>
            <p className="text-xs text-text-muted mt-0.5">Total Sessions</p>
          </div>
          <div className="card px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold text-green-600">{completed}</p>
            <p className="text-xs text-text-muted mt-0.5">Completed</p>
          </div>
          <div className="card px-4 py-3 flex-1 text-center">
            <p className="text-2xl font-bold text-accent">{enrolled}</p>
            <p className="text-xs text-text-muted mt-0.5">Enrolled</p>
          </div>
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Training History</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <BookOpen className="w-10 h-10 text-border" />
            <p className="text-text-muted text-sm">No training sessions found.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((session) => (
              <div key={session.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{session.title}</p>
                    <div className="flex flex-wrap gap-3 mt-1">
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <User className="w-3 h-3" />
                        {session.trainer_name}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-text-muted">
                        <Clock className="w-3 h-3" />
                        {formatDate(session.start_date)}
                        {session.end_date !== session.start_date && ` – ${formatDate(session.end_date)}`}
                      </span>
                      {session.department && (
                        <span className="text-xs text-text-muted">{session.department}</span>
                      )}
                      {session.is_mandatory && (
                        <span className="text-xs font-medium text-red-600">Mandatory</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[session.attendance_status] ?? 'bg-surface text-text-muted'}`}>
                      {session.attendance_status.charAt(0).toUpperCase() + session.attendance_status.slice(1)}
                    </span>
                    {session.score !== null && (
                      <span className="text-xs font-medium text-text-primary">Score: {session.score}%</span>
                    )}
                  </div>
                </div>
                {session.certificate_url && (
                  <a
                    href={session.certificate_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                  >
                    View Certificate →
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
