'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { useStore } from '@/lib/store'
import { Award, Plus, AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Certificate {
  id: string
  employee_id: string
  name: string
  issuer: string
  certificate_number: string
  issue_date: string | null
  expiry_date: string | null
  alert_days_before: number
  is_expired: boolean
  is_active: boolean
}

const certSchema = z.object({
  employee_id: z.string().uuid('Select an employee'),
  name: z.string().min(2, 'Name required'),
  issuer: z.string().optional(),
  certificate_number: z.string().optional(),
  issue_date: z.string().optional(),
  expiry_date: z.string().optional(),
  alert_days_before: z.coerce.number().min(1).default(30),
})
type CertForm = z.infer<typeof certSchema>

function daysUntil(date: string): number {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86_400_000)
}

function AddCertificateModal({ open, companyId, onClose }: { open: boolean; companyId: string | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: empData } = useQuery({
    queryKey: ['employees-list', companyId],
    queryFn: async () => (await fetch(`/api/employees?companyId=${companyId}&pageSize=200`)).json(),
    enabled: !!companyId,
  })
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CertForm>({
    resolver: zodResolver(certSchema),
    defaultValues: { alert_days_before: 30 },
  })

  const create = useMutation({
    mutationFn: async (body: CertForm) => {
      const res = await fetch('/api/hr/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, company_id: companyId, issue_date: body.issue_date || null, expiry_date: body.expiry_date || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save certificate')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['certificates'] })
      toast.success('Certificate tracked')
      reset()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open={open} onClose={onClose} title="Track Certificate" size="md">
      <form onSubmit={handleSubmit(v => create.mutateAsync(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Employee *</label>
          <select className="input" {...register('employee_id')}>
            <option value="">Select employee…</option>
            {(empData?.data ?? []).map((e: { id: string; user?: { full_name: string }; employee_number: string }) => (
              <option key={e.id} value={e.id}>{e.user?.full_name} ({e.employee_number})</option>
            ))}
          </select>
          {errors.employee_id && <p className="text-xs text-danger mt-1">{errors.employee_id.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Certificate *</label>
            <input className="input" placeholder="Police clearance / Food handler…" {...register('name')} />
            {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Issuer</label>
            <input className="input" placeholder="DCI / Ministry of Health" {...register('issuer')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Certificate No.</label>
            <input className="input" {...register('certificate_number')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Alert days before expiry</label>
            <input type="number" className="input" {...register('alert_days_before')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Issue Date</label>
            <input type="date" className="input" {...register('issue_date')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Expiry Date</label>
            <input type="date" className="input" {...register('expiry_date')} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Save
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function CertificatesClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [modal, setModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['certificates', activeCompanyId],
    queryFn: async () => {
      const params = activeCompanyId ? `?company_id=${activeCompanyId}` : ''
      const res = await fetch(`/api/hr/certificates${params}`)
      if (!res.ok) return { results: [] }
      return res.json()
    },
    staleTime: 60 * 1000,
  })
  const certs: Certificate[] = data?.results ?? data ?? []
  const expired = certs.filter(c => c.expiry_date && daysUntil(c.expiry_date) < 0)
  const expiring = certs.filter(c => c.expiry_date && daysUntil(c.expiry_date) >= 0 && daysUntil(c.expiry_date) <= c.alert_days_before)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Certificates</h1>
          <p className="text-sm text-text-muted mt-0.5">
            Police clearance, food handler, fitness-to-work and other credentials
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Track Certificate
        </button>
      </div>

      {(expired.length > 0 || expiring.length > 0) && (
        <div className="space-y-2">
          {expired.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">
                <span className="font-semibold">{expired.length} certificate{expired.length !== 1 ? 's' : ''} expired.</span> Arrange renewal immediately.
              </p>
            </div>
          )}
          {expiring.length > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{expiring.length} certificate{expiring.length !== 1 ? 's' : ''} in the alert window.</span> HR is also notified by email daily.
              </p>
            </div>
          )}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : certs.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Award className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No certificates tracked yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {certs.map(cert => {
              const days = cert.expiry_date ? daysUntil(cert.expiry_date) : null
              return (
                <div key={cert.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{cert.name}</p>
                    <p className="text-xs text-text-muted">
                      {cert.issuer || 'Unknown issuer'}
                      {cert.certificate_number && ` · #${cert.certificate_number}`}
                    </p>
                  </div>
                  {cert.expiry_date ? (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full border',
                      days! < 0 ? 'bg-red-50 text-red-700 border-red-200'
                        : days! <= cert.alert_days_before ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    )}>
                      {days! < 0 ? `expired ${Math.abs(days!)}d ago` : `${days}d left`}
                    </span>
                  ) : (
                    <span className="text-xs text-text-muted">no expiry</span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AddCertificateModal open={modal} companyId={activeCompanyId} onClose={() => setModal(false)} />
    </div>
  )
}
