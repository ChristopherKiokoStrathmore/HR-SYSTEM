'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { JobPosting } from '@hr/shared'

export interface JobPostingFilters {
  companyId?: string
  status?: string
  search?: string
}

async function fetchJobPostings(filters: JobPostingFilters) {
  const params = new URLSearchParams()
  if (filters.companyId) params.set('companyId', filters.companyId)
  if (filters.status) params.set('status', filters.status)
  if (filters.search) params.set('search', filters.search)
  const res = await fetch(`/api/job-postings?${params}`)
  if (!res.ok) throw new Error('Failed to fetch job postings')
  return res.json() as Promise<{ data: JobPosting[]; count: number }>
}

export function useJobPostings(filters: JobPostingFilters = {}) {
  return useQuery({
    queryKey: ['job-postings', filters],
    queryFn: () => fetchJobPostings(filters),
  })
}

export function useJobPosting(id: string | null) {
  return useQuery({
    queryKey: ['job-postings', id],
    queryFn: async () => {
      const res = await fetch(`/api/job-postings/${id}`)
      if (!res.ok) throw new Error('Not found')
      return res.json() as Promise<{ data: JobPosting }>
    },
    enabled: !!id,
  })
}

export function useCreateJobPosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<JobPosting>) => {
      const res = await fetch('/api/job-postings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-postings'] }),
  })
}

export function useUpdateJobPosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<JobPosting> & { id: string }) => {
      const res = await fetch(`/api/job-postings/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['job-postings'] })
      qc.invalidateQueries({ queryKey: ['job-postings', vars.id] })
    },
  })
}

export function useDeleteJobPosting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/job-postings/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['job-postings'] }),
  })
}
