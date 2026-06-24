'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

/** Part B2 — company-admin RBAC management hooks (proxied to Django /api/rbac). */

const BASE = '/api/hr/orgrbac'

export interface Organization {
  id: string
  name: string
  type: 'INTERNAL' | 'CLIENT'
  status: 'ACTIVE' | 'SUSPENDED'
  industry: string
  country: string
  logo_url: string
  company_id: string | null
}

export interface Role {
  id: string
  name: string
  description: string
  organization: string | null
  is_system_role: boolean
  permission_codes: string[]
}

export interface PermissionDef {
  id: string
  resource: string
  action: string
  code: string
  description: string
}

export interface OrganigramNode {
  id: string
  organization: string
  role: string | null
  role_name: string | null
  parent_node: string | null
  title: string
  user_id: string | null
}

export interface UserRoleAssignment {
  id: string
  user_id: string
  role: string
  role_name: string
  organization: string
}

// DRF may return a plain array (pagination disabled) or {results: [...]}.
function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Array.isArray((data as any).results)) {
    return (data as any).results as T[]
  }
  return []
}

async function req<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((json as any)?.error || 'Request failed')
  return json as T
}

// ---- Organizations / partner companies ----------------------------------
export function useOrganizations(type?: 'CLIENT' | 'INTERNAL') {
  return useQuery({
    queryKey: ['rbac-orgs', type],
    queryFn: async () => asList<Organization>(
      await req(`/organizations${type ? `?type=${type}` : ''}`)),
  })
}

export function useCreateOrganization() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Partial<Organization>) =>
      req<Organization>('/organizations', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac-orgs'] }),
  })
}

export function useSeedRoles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (orgId: string) =>
      req(`/organizations/${orgId}/seed-roles`, { method: 'POST' }),
    onSuccess: (_d, orgId) => qc.invalidateQueries({ queryKey: ['rbac-roles', orgId] }),
  })
}

// ---- Permissions catalogue ----------------------------------------------
export function usePermissionCatalog() {
  return useQuery({
    queryKey: ['rbac-perm-catalog'],
    queryFn: async () => asList<PermissionDef>(await req('/permissions')),
    staleTime: 5 * 60_000,
  })
}

// ---- Roles ---------------------------------------------------------------
export function useRoles(orgId: string | null) {
  return useQuery({
    enabled: !!orgId,
    queryKey: ['rbac-roles', orgId],
    queryFn: async () => asList<Role>(await req(`/roles?organization=${orgId}`)),
  })
}

export function useCreateRole(orgId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { name: string; description?: string }) =>
      req<Role>('/roles', {
        method: 'POST',
        body: JSON.stringify({ ...body, organization: orgId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac-roles', orgId] }),
  })
}

export function useSetRolePermissions(orgId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ roleId, permissions }: { roleId: string; permissions: string[] }) =>
      req(`/roles/${roleId}/permissions`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac-roles', orgId] }),
  })
}

// ---- Organigram ----------------------------------------------------------
export function useOrganigram(orgId: string | null) {
  return useQuery({
    enabled: !!orgId,
    queryKey: ['rbac-organigram', orgId],
    queryFn: async () => asList<OrganigramNode>(await req(`/organigram?organization=${orgId}`)),
  })
}

export function useSaveNode(orgId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<OrganigramNode> & { id?: string }) =>
      req(`/organigram${id ? `/${id}` : ''}`, {
        method: id ? 'PATCH' : 'POST',
        body: JSON.stringify({ organization: orgId, ...body }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac-organigram', orgId] }),
  })
}

export function useDeleteNode(orgId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => req(`/organigram/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac-organigram', orgId] }),
  })
}

// ---- User-role assignments ----------------------------------------------
export function useUserRoles(orgId: string | null) {
  return useQuery({
    enabled: !!orgId,
    queryKey: ['rbac-user-roles', orgId],
    queryFn: async () => asList<UserRoleAssignment>(await req(`/user-roles?organization=${orgId}`)),
  })
}

export function useAssignRole(orgId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: { user_id: string; role: string }) =>
      req('/user-roles', {
        method: 'POST',
        body: JSON.stringify({ ...body, organization: orgId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac-user-roles', orgId] }),
  })
}

export function useRevokeRole(orgId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => req(`/user-roles/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac-user-roles', orgId] }),
  })
}
