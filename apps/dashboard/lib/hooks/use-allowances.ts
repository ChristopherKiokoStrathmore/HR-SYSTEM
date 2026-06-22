'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

export interface NamedType {
  id: string
  name: string
  taxable?: boolean
}

// The Django proxy returns either a bare array or DRF's {count, results}.
function unwrap<T = unknown>(d: unknown): T[] {
  if (Array.isArray(d)) return d as T[]
  const o = d as { results?: T[]; data?: T[] }
  return o?.results ?? o?.data ?? []
}

async function jget(url: string) {
  const r = await fetch(url)
  if (!r.ok) throw new Error('Failed to load')
  return r.json()
}

async function jpost(url: string, body: unknown) {
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error((d as { error?: string; detail?: string })?.error || (d as { detail?: string })?.detail || 'Request failed')
  return d
}

export function useAllowanceTypes() {
  return useQuery({
    queryKey: ['allowance-types'],
    queryFn: async () => unwrap<NamedType>(await jget('/api/hr/allowance-types')),
  })
}

export function useDeductionTypes() {
  return useQuery({
    queryKey: ['deduction-types'],
    queryFn: async () => unwrap<NamedType>(await jget('/api/hr/deduction-types')),
  })
}

/** Mutations for creating allowance/deduction line items + types. */
export function useAllowanceDeductionActions() {
  const qc = useQueryClient()
  const invalidateTypes = () => {
    qc.invalidateQueries({ queryKey: ['allowance-types'] })
    qc.invalidateQueries({ queryKey: ['deduction-types'] })
  }
  return {
    createAllowanceType: useMutation({
      mutationFn: (b: { name: string; taxable: boolean }) => jpost('/api/hr/allowance-types', b),
      onSuccess: invalidateTypes,
    }),
    createDeductionType: useMutation({
      mutationFn: (b: { name: string }) => jpost('/api/hr/deduction-types', b),
      onSuccess: invalidateTypes,
    }),
    addAllowance: useMutation({
      mutationFn: (b: Record<string, unknown>) => jpost('/api/hr/allowances', b),
    }),
    addDeduction: useMutation({
      mutationFn: (b: Record<string, unknown>) => jpost('/api/hr/deductions', b),
    }),
    assignAllowanceDept: useMutation({
      mutationFn: (b: Record<string, unknown>) => jpost('/api/hr/allowances/assign_department', b),
    }),
    assignDeductionDept: useMutation({
      mutationFn: (b: Record<string, unknown>) => jpost('/api/hr/deductions/assign_department', b),
    }),
  }
}
