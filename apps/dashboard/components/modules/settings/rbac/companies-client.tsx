'use client'

import { useState } from 'react'
import {
  Building2, Plus, Loader2, ShieldCheck, Network, Users as UsersIcon, ImageIcon,
} from 'lucide-react'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import {
  useOrganizations, useCreateOrganization, type Organization,
} from '@/lib/hooks/use-rbac-admin'
import { RolesMatrix } from './roles-matrix'
import { Organogram } from './organogram'
import { TeamAssignments } from './team-assignments'

const SUB_TABS = [
  { id: 'roles', label: 'Roles & Permissions', icon: ShieldCheck },
  { id: 'organogram', label: 'Organogram', icon: Network },
  { id: 'team', label: 'Team', icon: UsersIcon },
] as const
type SubTab = (typeof SUB_TABS)[number]['id']

function AddCompanyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const create = useCreateOrganization()
  const [form, setForm] = useState({
    name: '', industry: '', country: '', status: 'ACTIVE', logo_url: '',
  })

  function onLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm((f) => ({ ...f, logo_url: String(reader.result) }))
    reader.readAsDataURL(file)
  }

  async function submit() {
    if (!form.name.trim()) return toast.error('Company name is required')
    try {
      await create.mutateAsync({ ...form, type: 'CLIENT' } as Partial<Organization>)
      toast.success('Partner company added', 'A client_admin role was auto-provisioned.')
      onClose()
      setForm({ name: '', industry: '', country: '', status: 'ACTIVE', logo_url: '' })
    } catch (e) {
      toast.error('Failed to add company', String(e))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add Partner Company" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Company Name *</label>
          <input className="input" placeholder="EABL" value={form.name}
                 onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Industry</label>
            <input className="input" placeholder="Manufacturing" value={form.industry}
                   onChange={(e) => setForm({ ...form, industry: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Country</label>
            <input className="input" placeholder="Kenya" value={form.country}
                   onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Status</label>
            <select className="input" value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Logo</label>
            <label className="input flex items-center gap-2 cursor-pointer text-text-muted">
              <ImageIcon className="w-4 h-4" />
              <span className="truncate">{form.logo_url ? 'Selected' : 'Upload logo'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={onLogo} />
            </label>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={submit} disabled={create.isPending}
                  className="btn-primary flex-1 flex items-center justify-center gap-2">
            {create.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Add Company
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function CompaniesClient() {
  const { data: orgs = [], isLoading } = useOrganizations('CLIENT')
  const activeCompanyId = useStore((s) => s.activeCompanyId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [subTab, setSubTab] = useState<SubTab>('roles')

  const selected = orgs.find((o) => o.id === selectedId) || null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Partner Companies</h2>
          <p className="text-sm text-text-muted">Onboard client companies and manage their roles, permissions and org charts.</p>
        </div>
        <button onClick={() => setAddOpen(true)} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Add Company
        </button>
      </div>

      {/* Company selector */}
      {isLoading ? (
        <div className="py-8 text-center text-text-muted"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
      ) : orgs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-border rounded-xl text-text-muted">
          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No partner companies yet.</p>
          <p className="text-xs mt-0.5">Add your first client company (EABL, Airtel, Safaricom…).</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {orgs.map((o) => (
              <button
                key={o.id}
                onClick={() => setSelectedId(o.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm',
                  selectedId === o.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border text-text-muted hover:border-accent/50'
                )}
              >
                <Building2 className="w-4 h-4" />
                {o.name}
                <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full',
                  o.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger')}>
                  {o.status}
                </span>
              </button>
            ))}
          </div>

          {selected && (
            <div className="space-y-4">
              <div className="flex gap-1 p-1 bg-surface-alt rounded-xl border border-border w-fit">
                {SUB_TABS.map((t) => {
                  const Icon = t.icon
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSubTab(t.id)}
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                        subTab === t.id
                          ? 'bg-white shadow-sm text-text-primary border border-border/50'
                          : 'text-text-muted hover:text-text-primary'
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  )
                })}
              </div>

              {subTab === 'roles' && <RolesMatrix orgId={selected.id} />}
              {subTab === 'organogram' && <Organogram orgId={selected.id} />}
              {subTab === 'team' && <TeamAssignments orgId={selected.id} companyId={selected.company_id || activeCompanyId} />}
            </div>
          )}
        </>
      )}

      <AddCompanyModal open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}
