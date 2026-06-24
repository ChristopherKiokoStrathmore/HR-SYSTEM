'use client'

import { useState } from 'react'
import { Search, Loader2, UserPlus, Trash2, Users } from 'lucide-react'
import { toast } from '@/lib/toast'
import { useEmployees } from '@/lib/hooks/use-employees'
import {
  useRoles, useUserRoles, useAssignRole, useRevokeRole,
} from '@/lib/hooks/use-rbac-admin'

export function TeamAssignments({ orgId, companyId }: { orgId: string; companyId: string | null }) {
  const { data: roles = [] } = useRoles(orgId)
  const { data: assignments = [], isLoading } = useUserRoles(orgId)
  const assignRole = useAssignRole(orgId)
  const revokeRole = useRevokeRole(orgId)

  const [search, setSearch] = useState('')
  const { data: empData } = useEmployees({ search, companyId: companyId || undefined, pageSize: 10 })
  const employees = empData?.data ?? []

  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null)
  const [roleId, setRoleId] = useState('')

  async function handleAssign() {
    if (!picked || !roleId) return toast.error('Pick a user and a role')
    try {
      await assignRole.mutateAsync({ user_id: picked.id, role: roleId })
      toast.success('Role assigned', `${picked.name}`)
      setPicked(null); setRoleId(''); setSearch('')
    } catch (e) {
      toast.error('Failed to assign role', String(e))
    }
  }

  function handleRevoke(id: string, name: string) {
    if (!confirm(`Revoke this role from ${name}? Their permissions update immediately.`)) return
    revokeRole.mutate(id, {
      onSuccess: () => toast.success('Role revoked'),
      onError: (e) => toast.error('Failed to revoke', String(e)),
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-text-primary">Team & Role Assignments</h3>
        <p className="text-xs text-text-muted">Assign users to company roles. A user can hold several.</p>
      </div>

      {/* Assign new */}
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            className="input pl-10"
            placeholder="Search users by name or email…"
            value={picked ? picked.name : search}
            onChange={(e) => { setPicked(null); setSearch(e.target.value) }}
          />
        </div>
        {!picked && search && (
          <div className="max-h-44 overflow-y-auto border border-border rounded-lg divide-y divide-border">
            {employees.length === 0 ? (
              <p className="text-sm text-text-muted px-3 py-2">No matching users.</p>
            ) : employees.map((e: any) => (
              <button
                key={e.id}
                onClick={() => setPicked({ id: e.user_id || e.id, name: e.user?.full_name || e.user?.email || e.employee_number })}
                className="w-full text-left px-3 py-2 hover:bg-surface-alt text-sm flex items-center justify-between"
              >
                <span className="text-text-primary">{e.user?.full_name || e.employee_number}</span>
                <span className="text-text-muted text-xs">{e.user?.email}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2 items-center">
          <select className="input flex-1 min-w-[180px]" value={roleId} onChange={(e) => setRoleId(e.target.value)}>
            <option value="">Select role…</option>
            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <button
            onClick={handleAssign}
            disabled={!picked || !roleId || assignRole.isPending}
            className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50"
          >
            {assignRole.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Assign role
          </button>
        </div>
      </div>

      {/* Existing assignments */}
      {isLoading ? (
        <div className="py-8 text-center text-text-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : assignments.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl text-text-muted">
          <Users className="w-7 h-7 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No role assignments yet for this company.</p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-alt text-text-muted text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2.5 text-left">User</th>
                <th className="px-4 py-2.5 text-left">Role</th>
                <th className="px-4 py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {assignments.map((a) => (
                <tr key={a.id}>
                  <td className="px-4 py-2.5 font-mono text-xs text-text-body">{a.user_id}</td>
                  <td className="px-4 py-2.5 text-text-primary">{a.role_name}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => handleRevoke(a.id, a.user_id)}
                      className="text-danger hover:underline text-xs inline-flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
