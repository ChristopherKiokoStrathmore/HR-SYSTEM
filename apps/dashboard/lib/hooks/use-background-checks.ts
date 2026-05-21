'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  BackgroundCheckWithSubject,
  BackgroundCheckType,
  BackgroundCheckStatus,
  CreateBackgroundCheckInput,
  ReviewBackgroundCheckInput,
} from '@hr/shared'

interface BackgroundChecksResponse {
  data: BackgroundCheckWithSubject[]
  count: number
  page: number
  pageSize: number
  totalPages: number
}

interface BackgroundCheckFilters {
  companyId?: string | null
  status?: BackgroundCheckStatus
  checkType?: BackgroundCheckType
  employeeId?: string
  candidateId?: string
  expiringWithinDays?: number
  page?: number
  pageSize?: number
}

/**
 * Fetch background checks with optional filters
 */
export function useBackgroundChecks(filters: BackgroundCheckFilters = {}) {
  const { companyId, status, checkType, employeeId, candidateId, expiringWithinDays, page = 1, pageSize = 25 } = filters

  return useQuery({
    queryKey: ['background-checks', companyId, status, checkType, employeeId, candidateId, expiringWithinDays, page, pageSize],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (companyId) params.set('companyId', companyId)
      if (status) params.set('status', status)
      if (checkType) params.set('checkType', checkType)
      if (employeeId) params.set('employeeId', employeeId)
      if (candidateId) params.set('candidateId', candidateId)
      if (expiringWithinDays) params.set('expiringWithinDays', expiringWithinDays.toString())
      params.set('page', page.toString())
      params.set('pageSize', pageSize.toString())

      const res = await fetch(`/api/background-checks?${params.toString()}`)
      if (!res.ok) throw new Error('Failed to fetch background checks')
      return res.json() as Promise<BackgroundChecksResponse>
    },
    staleTime: 60 * 1000,
  })
}

/**
 * Fetch a single background check by ID
 */
export function useBackgroundCheck(id: string | null) {
  return useQuery({
    queryKey: ['background-check', id],
    queryFn: async () => {
      const res = await fetch(`/api/background-checks/${id}`)
      if (!res.ok) throw new Error('Background check not found')
      return res.json() as Promise<{ data: BackgroundCheckWithSubject }>
    },
    enabled: !!id,
  })
}

/**
 * Fetch background checks for a specific employee
 */
export function useEmployeeBackgroundChecks(employeeId: string | null) {
  return useQuery({
    queryKey: ['background-checks-employee', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/background-checks?employeeId=${employeeId}`)
      if (!res.ok) return { data: [] }
      return res.json() as Promise<BackgroundChecksResponse>
    },
    enabled: !!employeeId,
    staleTime: 60 * 1000,
  })
}

/**
 * Fetch background checks for a specific candidate
 */
export function useCandidateBackgroundChecks(candidateId: string | null) {
  return useQuery({
    queryKey: ['background-checks-candidate', candidateId],
    queryFn: async () => {
      const res = await fetch(`/api/background-checks?candidateId=${candidateId}`)
      if (!res.ok) return { data: [] }
      return res.json() as Promise<BackgroundChecksResponse>
    },
    enabled: !!candidateId,
    staleTime: 60 * 1000,
  })
}

/**
 * Create a new background check request
 */
export function useCreateBackgroundCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateBackgroundCheckInput) => {
      const res = await fetch('/api/background-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create background check')
      }
      return res.json() as Promise<{ data: BackgroundCheckWithSubject }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['background-checks'] })
      qc.invalidateQueries({ queryKey: ['background-checks-employee'] })
      qc.invalidateQueries({ queryKey: ['background-checks-candidate'] })
    },
  })
}

/**
 * Review/complete a background check
 */
export function useReviewBackgroundCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string } & ReviewBackgroundCheckInput) => {
      const res = await fetch(`/api/background-checks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to review background check')
      }
      return res.json() as Promise<{ data: BackgroundCheckWithSubject }>
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['background-checks'] })
      qc.invalidateQueries({ queryKey: ['background-check', variables.id] })
      qc.invalidateQueries({ queryKey: ['background-checks-employee'] })
      qc.invalidateQueries({ queryKey: ['background-checks-candidate'] })
    },
  })
}

/**
 * Update background check status (for changing to in_progress, etc.)
 */
export function useUpdateBackgroundCheckStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: BackgroundCheckStatus; notes?: string }) => {
      const res = await fetch(`/api/background-checks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to update background check')
      }
      return res.json() as Promise<{ data: BackgroundCheckWithSubject }>
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['background-checks'] })
      qc.invalidateQueries({ queryKey: ['background-check', variables.id] })
    },
  })
}

/**
 * Delete (soft) a background check
 */
export function useDeleteBackgroundCheck() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/background-checks/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to delete background check')
      }
      return res.json() as Promise<{ success: boolean }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['background-checks'] })
      qc.invalidateQueries({ queryKey: ['background-checks-employee'] })
      qc.invalidateQueries({ queryKey: ['background-checks-candidate'] })
    },
  })
}

/**
 * Get stats for background checks dashboard
 */
export function useBackgroundCheckStats(companyId: string | null) {
  const { data } = useBackgroundChecks({ companyId, pageSize: 1000 })

  const checks = data?.data ?? []

  return {
    total: checks.length,
    pending: checks.filter(c => c.status === 'pending').length,
    inProgress: checks.filter(c => c.status === 'in_progress').length,
    passed: checks.filter(c => c.status === 'passed').length,
    failed: checks.filter(c => c.status === 'failed').length,
    flagged: checks.filter(c => c.status === 'flagged').length,
    expiringSoon: checks.filter(c => {
      if (!c.expiry_date) return false
      const expiry = new Date(c.expiry_date)
      const thirtyDaysFromNow = new Date()
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
      return expiry <= thirtyDaysFromNow && expiry >= new Date()
    }).length,
  }
}
