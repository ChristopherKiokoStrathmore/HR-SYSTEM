'use client'

import { useMemo, useState, useEffect } from 'react'
import { Loader2, Plus, Save, Sparkles, Shield } from 'lucide-react'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  useRoles, useCreateRole, useSetRolePermissions, usePermissionCatalog,
  useSeedRoles, type Role,
} from '@/lib/hooks/use-rbac-admin'

export function RolesMatrix({ orgId }: { orgId: string }) {
  const { data: roles = [], isLoading: rolesLoading } = useRoles(orgId)
  const { data: catalog = [] } = usePermissionCatalog()
  const createRole = useCreateRole(orgId)
  const setPerms = useSetRolePermissions(orgId)
  const seedRoles = useSeedRoles()

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Set<string>>(new Set())
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')

  const selectedRole: Role | undefined = roles.find((r) => r.id === selectedRoleId)

  // Resources (rows) and actions (columns) derived from the permission catalogue.
  const { resources, actions, valid } = useMemo(() => {
    const resSet = new Set<string>()
    const actSet = new Set<string>()
    const validCells = new Set<string>()
    catalog.forEach((p) => {
      resSet.add(p.resource)
      actSet.add(p.action)
      validCells.add(`${p.resource}.${p.action}`)
    })
    const order = ['view', 'create', 'edit', 'delete', 'approve', 'export']
    const actions = Array.from(actSet).sort(
      (a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99))
    return { resources: Array.from(resSet).sort(), actions, valid: validCells }
  }, [catalog])

  // Load the selected role's grants into the editable draft.
  useEffect(() => {
    if (selectedRole) setDraft(new Set(selectedRole.permission_codes))
  }, [selectedRoleId]) // eslint-disable-line react-hooks/exhaustive-deps

  function toggle(code: string) {
    setDraft((prev) => {
      const next = new Set(prev)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  async function handleSave() {
    if (!selectedRole) return
    try {
      await setPerms.mutateAsync({ roleId: selectedRole.id, permissions: Array.from(draft) })
      toast.success('Permissions saved', `${selectedRole.name} updated.`)
    } catch (e) {
      toast.error('Failed to save permissions', String(e))
    }
  }

  async function handleCreate() {
    if (!newName.trim()) return
    try {
      const role = await createRole.mutateAsync({ name: newName.trim() })
      toast.success('Role created', newName)
      setNewName('')
      setCreating(false)
      setSelectedRoleId(role.id)
    } catch (e) {
      toast.error('Failed to create role', String(e))
    }
  }

  const dirty = selectedRole &&
    (draft.size !== selectedRole.permission_codes.length ||
      [...draft].some((c) => !selectedRole.permission_codes.includes(c)))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Roles & Permissions</h3>
          <p className="text-xs text-text-muted">Roles are scoped to this company only.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => seedRoles.mutate(orgId, {
              onSuccess: () => toast.success('Templates added'),
              onError: (e) => toast.error('Failed', String(e)),
            })}
            disabled={seedRoles.isPending}
            className="btn-ghost text-sm flex items-center gap-1.5"
          >
            {seedRoles.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Pre-populate templates
          </button>
          <button onClick={() => setCreating((v) => !v)} className="btn-secondary text-sm flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> New role
          </button>
        </div>
      </div>

      {creating && (
        <div className="flex items-center gap-2 p-3 rounded-xl border border-border bg-surface-alt">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Role name (e.g. Regional Manager)"
            className="input flex-1"
          />
          <button onClick={handleCreate} disabled={createRole.isPending} className="btn-primary text-sm">
            {createRole.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
          </button>
        </div>
      )}

      {rolesLoading ? (
        <div className="py-8 text-center text-text-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : roles.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl text-text-muted">
          <Shield className="w-7 h-7 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No roles yet for this company.</p>
          <p className="text-xs mt-0.5">Add one or pre-populate the client templates.</p>
        </div>
      ) : (
        <>
          {/* Role selector */}
          <div className="flex flex-wrap gap-2">
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setSelectedRoleId(r.id)}
                className={cn(
                  'px-3 py-1.5 rounded-lg border text-sm',
                  selectedRoleId === r.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-accent/50'
                )}
              >
                {r.name}
              </button>
            ))}
          </div>

          {/* Matrix */}
          {selectedRole && (
            <div className="space-y-3">
              <div className="overflow-x-auto border border-border rounded-xl">
                <table className="w-full text-sm">
                  <thead className="bg-surface-alt text-text-muted text-xs uppercase tracking-wide">
                    <tr>
                      <th className="px-4 py-2.5 text-left">Resource</th>
                      {actions.map((a) => (
                        <th key={a} className="px-3 py-2.5 text-center capitalize">{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {resources.map((res) => (
                      <tr key={res}>
                        <td className="px-4 py-2 font-medium text-text-primary capitalize">{res}</td>
                        {actions.map((act) => {
                          const code = `${res}.${act}`
                          const exists = valid.has(code)
                          return (
                            <td key={act} className="px-3 py-2 text-center">
                              {exists ? (
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 accent-accent cursor-pointer"
                                  checked={draft.has(code)}
                                  onChange={() => toggle(code)}
                                />
                              ) : (
                                <span className="text-text-muted/30">—</span>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={!dirty || setPerms.isPending}
                  className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {setPerms.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save permissions
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
