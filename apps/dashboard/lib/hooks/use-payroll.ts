'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PayrollRun, PayrollRecord } from '@hr/shared'

interface PayrollRunWithRecords extends PayrollRun {
  records?: PayrollRecord[]
}

export function usePayrollRuns(companyId: string | null) {
  return useQuery({
    queryKey: ['payroll-runs', companyId],
    queryFn: async () => {
      const params = companyId ? `?companyId=${companyId}` : ''
      const res = await fetch(`/api/payroll/runs${params}`)
      if (!res.ok) throw new Error('Failed to fetch payroll runs')
      return res.json() as Promise<{ data: PayrollRun[] }>
    },
    staleTime: 60 * 1000,
  })
}

export function usePayrollRun(id: string | null) {
  return useQuery({
    queryKey: ['payroll-run', id],
    queryFn: async () => {
      const res = await fetch(`/api/payroll/runs/${id}`)
      if (!res.ok) throw new Error('Not found')
      return res.json() as Promise<{ data: PayrollRunWithRecords }>
    },
    enabled: !!id,
  })
}

export function useCreatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: { company_id: string; period_month: number; period_year: number }) => {
      const res = await fetch('/api/payroll/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json() as Promise<{ data: PayrollRun }>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  })
}

export function useProcessPayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/payroll/runs/${runId}`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json() as Promise<{ data: PayrollRun; recordCount: number }>
    },
    onSuccess: (_data, runId) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
      qc.invalidateQueries({ queryKey: ['payroll-run', runId] })
    },
  })
}

interface DisburseResult {
  success: boolean
  data: PayrollRun
  batches: Array<{
    batch_id: string
    method: string
    success: boolean
    processed?: number
    demo?: boolean
    error?: string
  }>
  totalProcessed: number
  demo: boolean
  reference: string
}

export function useDisbursePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ runId, method }: { runId: string; method: 'mpesa' | 'bank' | 'airtel' | 'all' }) => {
      const res = await fetch('/api/payroll/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, method }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json() as Promise<DisburseResult>
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payroll-runs'] }),
  })
}
