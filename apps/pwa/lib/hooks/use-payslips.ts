'use client'

import { useQuery } from '@tanstack/react-query'

export interface Payslip {
  id: string
  gross_salary: number
  paye: number
  nssf: number
  nhif: number
  helb: number
  other_deductions: number
  net_salary: number
  payment_method: string
  payment_status: string
  paid_at: string | null
  payroll_run: {
    period_month: number
    period_year: number
    status: string
  } | null
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export function usePayslips() {
  return useQuery<Payslip[]>({
    queryKey: ['me', 'payslips'],
    queryFn: async () => {
      const res = await fetch('/api/me/payslips')
      if (!res.ok) throw new Error('Failed to load payslips')
      const { data } = await res.json()
      return data
    },
  })
}

export function formatPeriod(month: number, year: number) {
  return `${MONTHS[month - 1]} ${year}`
}

export function formatKES(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(amount)
}
