'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface MeData {
  user: {
    id: string
    full_name: string
    email: string
    avatar_url: string | null
    preferred_language: 'en' | 'sw'
    phone: string | null
  }
  employee: {
    id: string
    employee_number: string
    job_title: string
    department: string | null
    company_id: string
    salary: number
    payment_method: 'bank' | 'mpesa' | 'airtel'
    bank_name: string | null
    bank_account: string | null
    mpesa_number: string | null
    airtel_number: string | null
    start_date: string
    company: { name: string; logo_url: string | null } | null
  } | null
}

async function fetchMe(): Promise<MeData> {
  const res = await fetch('/api/me')
  if (!res.ok) throw new Error('Failed to load profile')
  const { data } = await res.json()
  return data
}

export function useMe() {
  return useQuery({ queryKey: ['me'], queryFn: fetchMe, staleTime: 10 * 60 * 1000 })
}

export interface UpdatePaymentMethodInput {
  payment_method: 'bank' | 'mpesa' | 'airtel'
  bank_name?: string
  bank_account?: string
  mpesa_number?: string
  airtel_number?: string
}

export function useUpdatePaymentMethod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: UpdatePaymentMethodInput) => {
      const res = await fetch('/api/me/payment-method', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error || 'Failed to update payment method')
      }
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['me'] }),
  })
}
