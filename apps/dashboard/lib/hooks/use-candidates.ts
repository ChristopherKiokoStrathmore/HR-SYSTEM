'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { CandidateWithPosting, CandidateStage } from '@hr/shared'

export interface CandidateFilters {
  jobPostingId?: string
  stage?: string
  search?: string
}

export function useCandidates(filters: CandidateFilters = {}) {
  return useQuery({
    queryKey: ['candidates', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filters.jobPostingId) params.set('jobPostingId', filters.jobPostingId)
      if (filters.stage) params.set('stage', filters.stage)
      if (filters.search) params.set('search', filters.search)
      const res = await fetch(`/api/candidates?${params}`)
      if (!res.ok) throw new Error('Failed to fetch candidates')
      return res.json() as Promise<{ data: CandidateWithPosting[] }>
    },
  })
}

export function useUpdateCandidateStage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, stage, notes }: { id: string; stage: CandidateStage; notes?: string }) => {
      const res = await fetch(`/api/candidates/${id}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage, notes }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }),
  })
}

export function useScreenCV() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      jobPostingId,
      cvText,
      candidateId,
      fileBase64,
      mimeType,
    }: {
      jobPostingId: string
      cvText?: string
      candidateId?: string
      fileBase64?: string
      mimeType?: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }) => {
      const res = await fetch('/api/cv-screening', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobPostingId, cvText, candidateId, fileBase64, mimeType }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json() as Promise<{
        success: boolean
        result: import('@hr/shared').AiCvResult
        autoRejected: boolean
        threshold: number
      }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['candidates'] }),
  })
}
