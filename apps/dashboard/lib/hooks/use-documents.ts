'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { Document } from '@hr/shared'

const BASE = '/api/documents'

export function useDocuments(employeeId: string | null) {
  return useQuery({
    queryKey: ['documents', employeeId],
    queryFn: async () => {
      const res = await fetch(`${BASE}?employeeId=${employeeId}`)
      if (!res.ok) throw new Error('Failed to fetch documents')
      return res.json() as Promise<{ data: Document[] }>
    },
    enabled: !!employeeId,
  })
}

export function useUploadDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: {
      employee_id: string
      type: Document['type']
      file_url: string
      expiry_date?: string | null
      tenant_id: string
    }) => {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['documents', vars.employee_id] }),
  })
}

export function useVerifyDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      action,
      rejection_reason,
      employeeId,
    }: {
      id: string
      action: 'verify' | 'reject'
      rejection_reason?: string
      employeeId: string
    }) => {
      const res = await fetch(`${BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, rejection_reason }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: (_d, vars) =>
      qc.invalidateQueries({ queryKey: ['documents', vars.employeeId] }),
  })
}
