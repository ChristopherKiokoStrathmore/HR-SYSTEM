'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { EmployeeWithUser, CreateEmployeeInput, TerminationInput } from '@hr/shared'

const BASE = '/api/employees'

export interface EmployeeFilters {
  page?: number
  pageSize?: number
  search?: string
  companyId?: string
  status?: string
  department?: string
  employmentType?: string
}

async function fetchEmployees(filters: EmployeeFilters) {
  const params: Record<string, string> = {}
  if (filters.page) params.page = String(filters.page)
  if (filters.pageSize) params.pageSize = String(filters.pageSize)
  if (filters.search) params.search = filters.search
  if (filters.companyId) params.companyId = filters.companyId
  if (filters.status) params.status = filters.status
  if (filters.department) params.department = filters.department
  if (filters.employmentType) params.employmentType = filters.employmentType

  const qs = new URLSearchParams(params).toString()
  const res = await fetch(`${BASE}?${qs}`)
  if (!res.ok) throw new Error('Failed to fetch employees')
  return res.json() as Promise<{ data: EmployeeWithUser[]; count: number }>
}

async function fetchEmployee(id: string) {
  const res = await fetch(`${BASE}/${id}`)
  if (!res.ok) throw new Error('Employee not found')
  return res.json() as Promise<{ data: EmployeeWithUser }>
}

export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({
    queryKey: ['employees', filters],
    queryFn: () => fetchEmployees(filters),
  })
}

export function useEmployee(id: string | null) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => fetchEmployee(id!),
    enabled: !!id,
  })
}

export function useCreateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateEmployeeInput) => {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(JSON.stringify(json.error))
      return json
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useUpdateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: Partial<CreateEmployeeInput> & { id: string }) => {
      const res = await fetch(`${BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employees', vars.id] })
    },
  })
}

export function useTerminateEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: TerminationInput) => {
      const res = await fetch(`${BASE}/${body.employee_id}/terminate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['employees'] })
      qc.invalidateQueries({ queryKey: ['employees', vars.employee_id] })
    },
  })
}
