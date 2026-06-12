'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SkeletonTable } from '@/components/ui/skeleton'
import { toast } from '@/lib/toast'
import { useStore } from '@/lib/store'
import { ShieldCheck, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Frontend autonomy (01-Jun session): the highest-ranked role manages
 * permission grants for every role from this screen — no code changes.
 * The backend (IsHighestRank) rejects mutations from anyone below
 * company_admin, and audit-logs every grant/revoke.
 *
 * Hard rule rendered immutable here: payroll.* can never be granted to
 * manager/employee (PayrollHROnly enforces it server-side regardless).
 */

interface Role {
  id: string
  slug: string
  name: string
  rank: number
  is_system: boolean
  permissions: string[]
}

interface Permission {
  id: string
  codename: string
  module: string
  description: string
}

const PAYROLL_LOCKED_ROLES = new Set(['manager', 'employee'])

export function PermissionsClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const qc = useQueryClient()

  const { data: rolesData, isLoading: rolesLoading } = useQuery({
    queryKey: ['rbac-roles', activeCompanyId],
    queryFn: async () => {
      const params = activeCompanyId ? `?company_id=${activeCompanyId}` : ''
      const res = await fetch(`/api/hr/rbac/roles${params}`)
      if (!res.ok) throw new Error('Failed to load roles')
      return res.json()
    },
  })

  const { data: permsData, isLoading: permsLoading } = useQuery({
    queryKey: ['rbac-permissions'],
    queryFn: async () => {
      const res = await fetch('/api/hr/rbac/permissions')
      if (!res.ok) throw new Error('Failed to load permissions')
      return res.json()
    },
    staleTime: 5 * 60 * 1000,
  })

  const roles: Role[] = (rolesData?.results ?? rolesData ?? [])
    .sort((a: Role, b: Role) => a.rank - b.rank)
  const permissions: Permission[] = permsData?.results ?? permsData ?? []
  const modules = Array.from(new Set(permissions.map(p => p.module))).sort()

  const toggle = useMutation({
    mutationFn: async ({ roleId, codename, grant }: { roleId: string; codename: string; grant: boolean }) => {
      const res = await fetch(`/api/hr/rbac/roles/${roleId}/${grant ? 'grant' : 'revoke'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codenames: [codename] }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Permission change rejected')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rbac-roles'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  if (rolesLoading || permsLoading) return <SkeletonTable rows={8} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary flex items-center gap-2">
          <ShieldCheck className="w-6 h-6" /> Permissions
        </h1>
        <p className="text-sm text-text-muted mt-0.5">
          Grant or revoke module access per role. Changes apply immediately and are audit-logged.
          Payroll is permanently restricted to HR and administrators.
        </p>
      </div>

      <div className="card p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface">
              <th className="text-left px-4 py-3 font-semibold text-text-primary">Module</th>
              {roles.map(role => (
                <th key={role.id} className="px-3 py-3 font-semibold text-text-primary text-center whitespace-nowrap">
                  {role.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {modules.map(module => {
              const modulePerms = permissions.filter(p => p.module === module)
              return modulePerms.map((perm, i) => (
                <tr key={perm.id}>
                  {i === 0 && (
                    <td rowSpan={modulePerms.length} className="px-4 py-2 align-top">
                      <span className="font-medium text-text-primary capitalize">{module.replace('_', ' ')}</span>
                    </td>
                  )}
                  {roles.map(role => {
                    const granted = role.permissions.includes(perm.codename)
                    const isPayrollLock = perm.module === 'payroll' && PAYROLL_LOCKED_ROLES.has(role.slug)
                    const isTopRole = role.slug === 'super_admin'
                    const action = perm.codename.split('.')[1]
                    return (
                      <td key={role.id} className="px-3 py-2 text-center">
                        <label className={cn(
                          'inline-flex items-center gap-1.5 text-xs',
                          (isPayrollLock || isTopRole) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        )}>
                          {isPayrollLock ? (
                            <Lock className="w-3.5 h-3.5 text-text-muted" />
                          ) : (
                            <input
                              type="checkbox"
                              checked={granted || isTopRole}
                              disabled={isTopRole || toggle.isPending}
                              onChange={(e) => toggle.mutate({
                                roleId: role.id,
                                codename: perm.codename,
                                grant: e.target.checked,
                              })}
                              className="rounded border-border"
                            />
                          )}
                          <span className="text-text-muted">{action}</span>
                        </label>
                      </td>
                    )
                  })}
                </tr>
              ))
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-text-muted">
        Super Admin always has every permission. 🔒 = payroll is never grantable to managers
        or employees (enforced server-side). All changes appear in the audit log
        (<code>rbac.grant</code> / <code>rbac.revoke</code>).
      </p>
    </div>
  )
}
