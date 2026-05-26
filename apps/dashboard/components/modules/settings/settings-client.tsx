'use client'

import { useState } from 'react'
import { Building2, Users, Clock, ChevronRight, Loader2, Shield, Mail, Globe, MapPin, Palette, CheckCircle2, XCircle, Search, CreditCard, Banknote, Smartphone, Key } from 'lucide-react'
import { useStore } from '@/lib/store'
import { useCompany, useUpdateCompany } from '@/lib/hooks/use-companies'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/lib/toast'
import { Avatar } from '@/components/ui/avatar'
import { AuditLogClient } from './audit-log-client'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserRow {
  id: string
  full_name: string
  email: string
  role: 'super_admin' | 'hr_admin' | 'manager' | 'employee'
  avatar_url: string | null
  is_active: boolean
  last_login_at: string | null
  created_at: string
  company_id: string
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useUsers(companyId: string | null) {
  return useQuery<UserRow[]>({
    queryKey: ['users', companyId],
    queryFn: async () => {
      const params = companyId ? `?companyId=${companyId}` : ''
      const res = await fetch(`/api/users${params}`)
      if (!res.ok) throw new Error('Failed to fetch users')
      const { data } = await res.json()
      return data ?? []
    },
    staleTime: 30 * 1000,
  })
}

function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; role?: string; is_active?: boolean }) => {
      const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

// ─── Company Profile Tab ─────────────────────────────────────────────────────

function CompanyTab({ companyId }: { companyId: string | null }) {
  const { data, isLoading } = useCompany(companyId)
  const update = useUpdateCompany()
  const [form, setForm] = useState<Record<string, string | boolean> | null>(null)
  const company = data?.data

  const values = form ?? (company ? {
    name: company.name,
    industry: company.industry ?? '',
    country: company.country,
    city: company.city ?? '',
    contact_email: company.contact_email,
    primary_color: company.primary_color ?? '#1A2E5A',
    is_active: company.is_active,
  } : null)

  async function handleSave() {
    if (!companyId || !values) return
    try {
      await update.mutateAsync({ id: companyId, ...values })
      toast.success('Company profile saved')
      setForm(null)
    } catch (e) {
      toast.error('Failed to save', String(e))
    }
  }

  if (!companyId) {
    return (
      <div className="card text-center py-12 text-text-muted text-sm">
        Select a company from the header to edit its profile.
      </div>
    )
  }

  if (isLoading || !values) {
    return <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
  }

  const set = (key: string, val: string | boolean) => setForm(prev => ({ ...(prev ?? values), [key]: val }))
  const isDirty = form !== null

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: values.primary_color as string }}>
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-text-primary">{values.name as string}</p>
          <p className="text-xs text-text-muted">Company Profile</p>
        </div>
        {isDirty && (
          <span className="ml-auto text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200">Unsaved changes</span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Company Name</label>
          <input className="input" value={values.name as string} onChange={e => set('name', e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Industry</label>
          <input className="input" placeholder="e.g. Consulting" value={values.industry as string} onChange={e => set('industry', e.target.value)} />
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Contact Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input className="input pl-9" type="email" value={values.contact_email as string} onChange={e => set('contact_email', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Country</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input className="input pl-9" value={values.country as string} onChange={e => set('country', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">City</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input className="input pl-9" placeholder="Nairobi" value={values.city as string} onChange={e => set('city', e.target.value)} />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Brand Colour</label>
          <div className="flex gap-2">
            <input
              type="color"
              value={values.primary_color as string}
              onChange={e => set('primary_color', e.target.value)}
              className="h-9 w-14 rounded-lg border border-border cursor-pointer"
            />
            <div className="relative flex-1">
              <Palette className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
              <input className="input pl-9 font-mono" value={values.primary_color as string} onChange={e => set('primary_color', e.target.value)} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 h-9 mt-5">
          <button
            type="button"
            onClick={() => set('is_active', !(values.is_active as boolean))}
            className={cn('relative w-11 h-6 rounded-full transition-colors', values.is_active ? 'bg-success' : 'bg-border')}
          >
            <span className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', values.is_active ? 'left-5' : 'left-0.5')} />
          </button>
          <span className="text-sm text-text-body">{values.is_active ? 'Active company' : 'Inactive company'}</span>
        </div>
      </div>

      <div className="flex gap-3 pt-2 border-t border-border">
        {isDirty && (
          <button onClick={() => setForm(null)} className="btn-ghost px-5 text-sm">Discard</button>
        )}
        <button
          onClick={handleSave}
          disabled={!isDirty || update.isPending}
          className="btn-primary px-6 text-sm flex items-center gap-2 ml-auto disabled:opacity-50"
        >
          {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Changes
        </button>
      </div>
    </div>
  )
}

// ─── Users & Roles Tab ───────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Admin',
  hr_admin: 'HR Admin',
  manager: 'Manager',
  employee: 'Employee',
}

const ROLE_COLORS: Record<string, string> = {
  super_admin: 'bg-purple-50 text-purple-700 border border-purple-200',
  hr_admin: 'bg-primary/10 text-primary border border-primary/20',
  manager: 'bg-amber-50 text-amber-700 border border-amber-200',
  employee: 'bg-surface-alt text-text-muted border border-border',
}

function UsersTab({ companyId }: { companyId: string | null }) {
  const { data: users, isLoading } = useUsers(companyId)
  const updateUser = useUpdateUser()
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editRole, setEditRole] = useState('')

  const filtered = (users ?? []).filter(u =>
    u.full_name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )

  async function saveRole(userId: string) {
    try {
      await updateUser.mutateAsync({ id: userId, role: editRole })
      toast.success('Role updated')
      setEditingId(null)
    } catch {
      toast.error('Failed to update role')
    }
  }

  async function toggleActive(user: UserRow) {
    try {
      await updateUser.mutateAsync({ id: user.id, is_active: !user.is_active })
      toast.success(user.is_active ? 'User deactivated' : 'User activated')
    } catch {
      toast.error('Failed to update user')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            className="input pl-9 text-sm"
            placeholder="Search users…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <span className="text-xs text-text-muted">{filtered.length} user{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div className="card text-center py-10 text-text-muted text-sm">No users found</div>
      )}

      <div className="divide-y divide-border card p-0 overflow-hidden">
        {filtered.map(user => (
          <div key={user.id} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-alt/50 transition-colors">
            <Avatar name={user.full_name} src={user.avatar_url ?? undefined} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-text-primary truncate">{user.full_name}</p>
                {!user.is_active && (
                  <span className="text-xs bg-danger/10 text-danger px-1.5 py-0.5 rounded-full">Inactive</span>
                )}
              </div>
              <p className="text-xs text-text-muted truncate">{user.email}</p>
            </div>

            <div className="flex items-center gap-2">
              {editingId === user.id ? (
                <>
                  <select
                    className="input text-xs h-7 py-0 px-2"
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                  >
                    {Object.entries(ROLE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                  <button onClick={() => saveRole(user.id)} className="text-xs text-success hover:underline">Save</button>
                  <button onClick={() => setEditingId(null)} className="text-xs text-text-muted hover:underline">Cancel</button>
                </>
              ) : (
                <>
                  <span
                    className={cn('text-xs px-2 py-0.5 rounded-full cursor-pointer', ROLE_COLORS[user.role] ?? ROLE_COLORS.employee)}
                    onClick={() => { setEditingId(user.id); setEditRole(user.role) }}
                    title="Click to change role"
                  >
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                  <button
                    onClick={() => toggleActive(user)}
                    title={user.is_active ? 'Deactivate user' : 'Activate user'}
                    className="text-text-muted hover:text-text-primary transition-colors"
                  >
                    {user.is_active
                      ? <CheckCircle2 className="w-4 h-4 text-success" />
                      : <XCircle className="w-4 h-4 text-danger" />
                    }
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Payroll Settings Tab ─────────────────────────────────────────────────────

function PayrollSettingsTab({ companyId }: { companyId: string | null }) {
  const { data, isLoading } = useCompany(companyId)
  const update = useUpdateCompany()
  const [form, setForm] = useState<Record<string, string | boolean | null> | null>(null)
  const [showCredentials, setShowCredentials] = useState(false)
  const company = data?.data

  const values = form ?? (company ? {
    company_bank_name: company.company_bank_name ?? '',
    company_bank_account: company.company_bank_account ?? '',
    company_bank_branch: company.company_bank_branch ?? '',
    mpesa_paybill_number: company.mpesa_paybill_number ?? '',
    mpesa_till_number: company.mpesa_till_number ?? '',
    mpesa_shortcode_type: company.mpesa_shortcode_type ?? 'paybill',
    airtel_business_number: company.airtel_business_number ?? '',
    airtel_business_name: company.airtel_business_name ?? '',
    pesapal_consumer_key: company.pesapal_consumer_key ?? '',
    pesapal_consumer_secret: company.pesapal_consumer_secret ?? '',
    pesapal_ipn_id: company.pesapal_ipn_id ?? '',
    payment_accounts_configured: company.payment_accounts_configured ?? false,
  } : null)

  async function handleSave() {
    if (!companyId || !values) return
    try {
      await update.mutateAsync({
        id: companyId,
        ...values,
        payment_accounts_configured: true,
      })
      toast.success('Payment settings saved')
      setForm(null)
    } catch (e) {
      toast.error('Failed to save', String(e))
    }
  }

  if (!companyId) {
    return (
      <div className="card text-center py-12 text-text-muted text-sm">
        Select a company from the header to configure payment settings.
      </div>
    )
  }

  if (isLoading || !values) {
    return <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-12 rounded-xl" />)}</div>
  }

  const set = (key: string, val: string | boolean | null) => setForm(prev => ({ ...(prev ?? values), [key]: val }))
  const isDirty = form !== null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-semibold text-text-primary">Payment Account Settings</p>
          <p className="text-xs text-text-muted">Configure company payment accounts for payroll disbursement</p>
        </div>
        {isDirty && (
          <span className="ml-auto text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200">Unsaved changes</span>
        )}
      </div>

      {/* Bank Account Section */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Banknote className="w-4 h-4 text-primary" />
          Bank Account (EFT)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Bank Name</label>
            <input className="input" placeholder="e.g. Equity Bank" value={values.company_bank_name as string} onChange={e => set('company_bank_name', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Account Number</label>
            <input className="input font-mono" placeholder="0123456789" value={values.company_bank_account as string} onChange={e => set('company_bank_account', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Branch</label>
            <input className="input" placeholder="e.g. Westlands" value={values.company_bank_branch as string} onChange={e => set('company_bank_branch', e.target.value)} />
          </div>
        </div>
      </div>

      {/* M-Pesa Section */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Smartphone className="w-4 h-4 text-green-600" />
          M-Pesa Business Account
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Shortcode Type</label>
            <select
              className="input"
              value={values.mpesa_shortcode_type as string}
              onChange={e => set('mpesa_shortcode_type', e.target.value)}
            >
              <option value="paybill">Paybill</option>
              <option value="till">Till Number</option>
            </select>
          </div>
          {values.mpesa_shortcode_type === 'paybill' ? (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Paybill Number</label>
              <input className="input font-mono" placeholder="888880" value={values.mpesa_paybill_number as string} onChange={e => set('mpesa_paybill_number', e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Till Number</label>
              <input className="input font-mono" placeholder="5050505" value={values.mpesa_till_number as string} onChange={e => set('mpesa_till_number', e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {/* Airtel Money Section */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Smartphone className="w-4 h-4 text-red-600" />
          Airtel Money Business Account
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Business Number</label>
            <input className="input font-mono" placeholder="0734000000" value={values.airtel_business_number as string} onChange={e => set('airtel_business_number', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Business Name</label>
            <input className="input" placeholder="Company Name" value={values.airtel_business_name as string} onChange={e => set('airtel_business_name', e.target.value)} />
          </div>
        </div>
      </div>

      {/* PesaPal API Credentials */}
      <div className="card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Key className="w-4 h-4 text-amber-600" />
            PesaPal API Credentials
          </div>
          <button
            onClick={() => setShowCredentials(!showCredentials)}
            className="text-xs text-accent hover:underline"
          >
            {showCredentials ? 'Hide' : 'Show'} Credentials
          </button>
        </div>
        <p className="text-xs text-text-muted">Configure PesaPal credentials for production payments. Leave blank to use demo mode.</p>
        {showCredentials && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Consumer Key</label>
              <input
                className="input font-mono text-xs"
                type="password"
                placeholder="••••••••"
                value={values.pesapal_consumer_key as string}
                onChange={e => set('pesapal_consumer_key', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Consumer Secret</label>
              <input
                className="input font-mono text-xs"
                type="password"
                placeholder="••••••••"
                value={values.pesapal_consumer_secret as string}
                onChange={e => set('pesapal_consumer_secret', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">IPN ID</label>
              <input
                className="input font-mono text-xs"
                placeholder="Pre-registered IPN ID"
                value={values.pesapal_ipn_id as string}
                onChange={e => set('pesapal_ipn_id', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2 border-t border-border">
        {isDirty && (
          <button onClick={() => setForm(null)} className="btn-ghost px-5 text-sm">Discard</button>
        )}
        <button
          onClick={handleSave}
          disabled={!isDirty || update.isPending}
          className="btn-primary px-6 text-sm flex items-center gap-2 ml-auto disabled:opacity-50"
        >
          {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
          Save Payment Settings
        </button>
      </div>
    </div>
  )
}

// ─── Main Settings Client ─────────────────────────────────────────────────────

const TABS = [
  { id: 'company', label: 'Company Profile', icon: Building2 },
  { id: 'payroll', label: 'Payroll Settings', icon: CreditCard },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'audit', label: 'Audit Log', icon: Clock },
] as const

type TabId = (typeof TABS)[number]['id']

export function SettingsClient() {
  const [activeTab, setActiveTab] = useState<TabId>('company')
  const companyId = useStore(s => s.activeCompanyId)

  return (
    <div className="space-y-6">
      {/* Tab nav */}
      <div className="flex gap-1 p-1 bg-surface-alt rounded-xl border border-border w-fit">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.id
                  ? 'bg-white shadow-sm text-text-primary border border-border/50'
                  : 'text-text-muted hover:text-text-primary'
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Hint */}
      {!companyId && activeTab !== 'audit' && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
          <Shield className="w-4 h-4 flex-shrink-0" />
          No company selected — showing all data. Select a company from the header to filter.
          <ChevronRight className="w-3 h-3 ml-auto" />
        </div>
      )}

      {/* Tab content */}
      {activeTab === 'company' && <CompanyTab companyId={companyId} />}
      {activeTab === 'payroll' && <PayrollSettingsTab companyId={companyId} />}
      {activeTab === 'users' && <UsersTab companyId={companyId} />}
      {activeTab === 'audit' && <AuditLogClient />}
    </div>
  )
}
