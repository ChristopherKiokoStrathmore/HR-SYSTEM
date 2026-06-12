'use client'

import { useQuery } from '@tanstack/react-query'
import type { Attendance } from '@hr/shared'

interface AttendanceWithEmployee extends Attendance {
  employee?: {
    employee_number: string
    job_title: string
    department: string | null
    user?: { full_name: string; avatar_url: string | null }
  }
}

interface AttendanceSummary {
  data: AttendanceWithEmployee[]
  stats: { present: number; absent: number; late: number; total: number }
}

export function useAttendanceSummary(companyId: string | null, date?: string) {
  return useQuery({
    queryKey: ['attendance-summary', companyId, date],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (companyId) params.set('companyId', companyId)
      if (date) params.set('date', date)
      const res = await fetch(`/api/attendance/summary?${params}`)
      if (!res.ok) throw new Error('Failed to fetch attendance summary')
      return res.json() as Promise<AttendanceSummary>
    },
    staleTime: 0,
    refetchInterval: 30 * 1000,
  })
}
