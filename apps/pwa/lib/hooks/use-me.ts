'use client'

import { useQuery } from '@tanstack/react-query'

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
    payment_method: string
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
