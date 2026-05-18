'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Company } from '@hr/shared'

const BASE = '/api/companies'

async function fetchCompanies(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}${qs ? `?${qs}` : ''}`)
  if (!res.ok) throw new Error('Failed to fetch companies')
  return res.json() as Promise<{ data: Company[]; count: number }>
}

async function fetchCompany(id: string) {
  const res = await fetch(`${BASE}/${id}`)
  if (!res.ok) throw new Error('Company not found')
  return res.json() as Promise<{ data: Company }>
}

export function useCompanies(params?: Record<string, string>) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () => fetchCompanies(params),
  })
}

export function useCompany(id: string | null) {
  return useQuery({
    queryKey: ['companies', id],
    queryFn: () => fetchCompany(id!),
    enabled: !!id,
  })
}

export function useCreateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: Partial<Company>) => {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })
}

export function useUpdateCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<Company> & { id: string }) => {
      const res = await fetch(`${BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['companies'] })
      qc.invalidateQueries({ queryKey: ['companies', vars.id] })
    },
  })
}

export function useDeleteCompany() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  })
}
