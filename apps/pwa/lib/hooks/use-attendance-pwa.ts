'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface AttendanceRecord {
  id: string
  shift_date: string
  check_in_time: string | null
  check_out_time: string | null
  check_in_lat: number | null
  check_in_lng: number | null
  status: string
  is_late: boolean
  distance_covered_km: number | null
}

export function useAttendance() {
  return useQuery<{ data: AttendanceRecord[]; today: string }>({
    queryKey: ['me', 'attendance'],
    queryFn: async () => {
      const res = await fetch('/api/me/attendance', { cache: 'no-store' })
      if (!res.ok) throw new Error('Failed to load attendance')
      return res.json()
    },
    staleTime: 0,
    refetchInterval: 60 * 1000,
  })
}

export function useCheckInOut() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { lat?: number; lng?: number; distanceKm?: number }) => {
      const res = await fetch('/api/me/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        // 409 already_done means the client had stale data — refetch so UI syncs
        if (json.action === 'already_done') {
          qc.invalidateQueries({ queryKey: ['me', 'attendance'] })
        }
        throw new Error(json.error)
      }
      return json as { action: 'checked_in' | 'checked_out'; workHours: number | null }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'attendance'] }),
  })
}
