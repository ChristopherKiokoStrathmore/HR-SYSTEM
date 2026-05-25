'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

// Types matching Django API response
export interface PayrollRecord {
  id: string
  employee: string
  employee_name: string
  employee_number: string
  basic_salary: number
  allowances: number
  overtime: number
  bonus: number
  gross_pay: number
  nssf_employee: number
  nssf_employer: number
  nhif: number
  paye: number
  housing_levy_employee: number
  housing_levy_employer: number
  helb: number
  other_deductions: number
  total_deductions: number
  net_pay: number
  payment_status: 'pending' | 'processing' | 'paid' | 'failed'
  payment_method: 'bank' | 'mpesa' | 'airtel'
  payment_reference: string | null
  payment_date: string | null
}

export interface PayrollRun {
  id: string
  period_start: string
  period_end: string
  pay_date: string
  status: 'draft' | 'calculated' | 'approved' | 'processing' | 'completed'
  total_gross: number
  total_net: number
  total_paye: number
  total_nssf: number
  total_nhif: number
  total_housing_levy: number
  total_helb: number
  employee_count: number
  notes: string | null
  created_by: string
  created_by_name: string
  approved_by: string | null
  approved_by_name: string | null
  approved_at: string | null
  created_at: string
  records?: PayrollRecord[]
}

export interface PaymentStatusSummary {
  summary: {
    total_records: number
    pending: number
    processing: number
    paid: number
    failed: number
  }
  batches: Array<{
    id: string
    payment_method: string
    status: string
    total_amount: number
    successful_amount: number
    failed_amount: number
    record_count: number
    successful_count: number
    failed_count: number
    started_at: string
    completed_at: string | null
  }>
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
      return res.json() as Promise<{ data: PayrollRun }>
    },
    enabled: !!id,
  })
}

export function useCreatePayrollRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      period_start: string
      period_end: string
      pay_date: string
      notes?: string
    }) => {
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

export function useCalculatePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/payroll/runs/${runId}/calculate`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json() as Promise<{ data: PayrollRun }>
    },
    onSuccess: (_data, runId) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
      qc.invalidateQueries({ queryKey: ['payroll-run', runId] })
    },
  })
}

export function useApprovePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/payroll/runs/${runId}/approve`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json() as Promise<{ data: PayrollRun }>
    },
    onSuccess: (_data, runId) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
      qc.invalidateQueries({ queryKey: ['payroll-run', runId] })
    },
  })
}

// Keep for backward compatibility - maps to calculate
export function useProcessPayrollRun() {
  return useCalculatePayroll()
}

interface DisburseResult {
  success: boolean
  data: PayrollRun
  reference: string
}

export function useDisbursePayroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      runId,
      method,
      recordIds,
    }: {
      runId: string
      method: 'mpesa' | 'bank' | 'airtel' | 'all'
      recordIds?: string[]
    }) => {
      const res = await fetch('/api/payroll/disburse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runId, method, recordIds }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json() as Promise<DisburseResult>
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
      qc.invalidateQueries({ queryKey: ['payroll-run', vars.runId] })
      qc.invalidateQueries({ queryKey: ['payment-status', vars.runId] })
    },
  })
}

export function usePaymentStatus(runId: string | null) {
  return useQuery({
    queryKey: ['payment-status', runId],
    queryFn: async () => {
      const res = await fetch(`/api/payroll/runs/${runId}/payment-status`)
      if (!res.ok) throw new Error('Failed to fetch payment status')
      return res.json() as Promise<{ data: PaymentStatusSummary }>
    },
    enabled: !!runId,
    refetchInterval: 10000, // Poll every 10 seconds for status updates
  })
}

export function useRetryFailedPayments() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (runId: string) => {
      const res = await fetch(`/api/payroll/runs/${runId}/retry-failed`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json() as Promise<{ data: PayrollRun }>
    },
    onSuccess: (_data, runId) => {
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
      qc.invalidateQueries({ queryKey: ['payroll-run', runId] })
      qc.invalidateQueries({ queryKey: ['payment-status', runId] })
    },
  })
}
