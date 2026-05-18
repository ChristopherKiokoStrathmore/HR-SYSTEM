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
      const res = await fetch('/api/me/attendance')
      if (!res.ok) throw new Error('Failed to load attendance')
      return res.json()
    },
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
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      return res.json() as Promise<{ action: 'checked_in' | 'checked_out'; workHours: number | null }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me', 'attendance'] }),
  })
}
