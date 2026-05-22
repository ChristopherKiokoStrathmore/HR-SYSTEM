'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { TrainingSession } from '@hr/shared'

export function useTrainingSessions(companyId: string | null) {
  return useQuery({
    queryKey: ['training-sessions-all', companyId],
    queryFn: async () => {
      const params = companyId ? `?companyId=${companyId}` : ''
      const res = await fetch(`/api/training/sessions${params}`)
      if (!res.ok) throw new Error('Failed to fetch sessions')
      return res.json() as Promise<{ data: TrainingSession[] }>
    },
    staleTime: 60 * 1000,
  })
}

export function useCreateTrainingSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<TrainingSession>) => {
      const res = await fetch('/api/training/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-sessions-all'] }),
  })
}

export function useEnrolEmployees() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, employeeIds }: { sessionId: string; employeeIds: string[] }) => {
      const res = await fetch('/api/training/enrol', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, employeeIds }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['training-sessions-all'] }),
  })
}
