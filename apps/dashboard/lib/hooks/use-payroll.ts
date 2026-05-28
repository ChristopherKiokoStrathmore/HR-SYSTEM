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
  gross_salary: number  // Alias for gross_pay
  nssf_employee: number
  nssf_employer: number
  nssf: number  // Total NSSF
  nhif: number
  paye: number
  housing_levy_employee: number
  housing_levy_employer: number
  helb: number
  other_deductions: number
  total_deductions: number
  net_pay: number
  net_salary: number  // Alias for net_pay
  payment_status: 'pending' | 'processing' | 'paid' | 'failed'
  payment_method: 'bank' | 'mpesa' | 'airtel'
  payment_reference: string | null
  payment_date: string | null
  paid_at: string | null
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
  completed_at: string | null
  // Derived/computed fields for UI compatibility
  period_month: number
  period_year: number
  total_deductions: number
}

export interface PayrollRecordWithEmployee extends PayrollRecord {
  employee_details?: {
    employee_number: string
    full_name: string
  }
}

// Types for new employee-centric payroll UI
export type PaymentSourceType = 'mpesa_wallet' | 'bank_wallet'
export type PaymentMethodType = 'mpesa' | 'bank' | 'airtel'

export interface EmployeeSalaryRow {
  id: string
  employee_id: string
  employee_name: string
  employee_number: string
  department: string | null
  salary: number
  payment_status: 'pending' | 'processing' | 'paid' | 'failed'
  payment_method: 'bank' | 'mpesa' | 'airtel'
  last_paid_at: string | null
}

export interface DepartmentPaymentStatus {
  department: string
  totalEmployees: number
  paidCount: number
  pendingCount: number
  status: 'all_paid' | 'partial' | 'none_paid'
}

export interface PaymentHistoryRecord {
  id: string
  employee_id: string
  employee_name: string
  employee_number: string
  department: string | null
  amount: number
  payment_method: 'bank' | 'mpesa' | 'airtel'
  payment_date: string
  reference: string | null
  status: 'paid' | 'failed'
  period_month: number
  period_year: number
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
      period_start?: string
      period_end?: string
      pay_date?: string
      notes?: string
      company_id?: string
      period_month?: number
      period_year?: number
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

interface DisburseBatch {
  method: string
  success: boolean
  processed?: number
  error?: string
}

interface DisburseResult {
  success: boolean
  data?: PayrollRun
  batches: DisburseBatch[]
  totalProcessed: number
  demo: boolean
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

// ============================================
// NEW HOOKS FOR EMPLOYEE-CENTRIC PAYROLL UI
// ============================================

/**
 * Fetch employees with their current payment status for the payroll table
 */
export function useEmployeesWithPaymentStatus(companyId: string | null) {
  return useQuery({
    queryKey: ['employees-payment-status', companyId],
    queryFn: async () => {
      const params = companyId ? `?companyId=${companyId}` : ''
      const res = await fetch(`/api/payroll/employee-status${params}`)
      if (!res.ok) throw new Error('Failed to fetch employee payment status')
      return res.json() as Promise<{
        data: EmployeeSalaryRow[]
        departments: DepartmentPaymentStatus[]
      }>
    },
    staleTime: 30 * 1000,
  })
}

/**
 * Fetch payment history records
 */
export function usePaymentHistory(companyId: string | null) {
  return useQuery({
    queryKey: ['payment-history', companyId],
    queryFn: async () => {
      const params = companyId ? `?companyId=${companyId}` : ''
      const res = await fetch(`/api/payroll/history${params}`)
      if (!res.ok) throw new Error('Failed to fetch payment history')
      return res.json() as Promise<{ data: PaymentHistoryRecord[] }>
    },
    staleTime: 60 * 1000,
  })
}

/**
 * Pay selected employees
 * Supports payment methods:
 * - mpesa: M-Pesa B2C via IntaSend
 * - bank: Bank EFT via PesaPal
 * - airtel: Airtel Money via PesaPal
 */
export function usePayEmployees() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      employeeIds,
      paymentMethod,
      paymentSource, // Legacy support
      companyId,
    }: {
      employeeIds: string[]
      paymentMethod?: PaymentMethodType
      paymentSource?: PaymentSourceType // Legacy support
      companyId: string
    }) => {
      const res = await fetch('/api/payroll/pay-employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeIds, paymentMethod, paymentSource, companyId }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json() as Promise<{
        success: boolean
        paidCount: number
        failedCount: number
        paymentMethod: PaymentMethodType
        reference: string
        batchId?: string
        message?: string
      }>
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees-payment-status'] })
      qc.invalidateQueries({ queryKey: ['payment-history'] })
      qc.invalidateQueries({ queryKey: ['payroll-runs'] })
    },
  })
}
