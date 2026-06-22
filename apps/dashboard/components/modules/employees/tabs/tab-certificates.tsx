'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { Award, Plus, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useState } from 'react'

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
  name: z.string().min(2, 'Certificate name required'),
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

function AddCertModal({
  open, employeeId, onClose,
}: { open: boolean; employeeId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<CertForm>({
    resolver: zodResolver(certSchema),
    defaultValues: { alert_days_before: 30 },
  })

  const create = useMutation({
    mutationFn: async (body: CertForm) => {
      const res = await fetch('/api/hr/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          employee_id: employeeId,
          issue_date: body.issue_date || null,
          expiry_date: body.expiry_date || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to save')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employee-certificates', employeeId] })
      toast.success('Certificate tracked')
      reset()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open={open} onClose={onClose} title="Track Certificate" size="md">
      <form onSubmit={handleSubmit(v => create.mutateAsync(v))} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-text-body mb-1.5">Certificate Name *</label>
            <input className="input" placeholder="Police Clearance / Food Handler…" {...register('name')} />
            {errors.name && <p className="text-xs text-danger mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Issuer</label>
            <input className="input" placeholder="DCI / Ministry of Health" {...register('issuer')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Certificate No.</label>
            <input className="input font-mono" {...register('certificate_number')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Issue Date</label>
            <input type="date" className="input" {...register('issue_date')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Expiry Date</label>
            <input type="date" className="input" {...register('expiry_date')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Alert days before expiry</label>
            <input type="number" className="input" {...register('alert_days_before')} />
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

export function TabCertificates({ employeeId }: { employeeId: string }) {
  const [modal, setModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['employee-certificates', employeeId],
    queryFn: async () => {
      const res = await fetch(`/api/hr/certificates?employee_id=${employeeId}`)
      if (!res.ok) return { results: [] }
      return res.json()
    },
    staleTime: 60 * 1000,
  })

  const certs: Certificate[] = data?.results ?? data ?? []
  const expired = certs.filter(c => c.expiry_date && daysUntil(c.expiry_date) < 0)
  const expiring = certs.filter(c => c.expiry_date && daysUntil(c.expiry_date) >= 0 && daysUntil(c.expiry_date) <= c.alert_days_before)
  const valid = certs.filter(c => !c.expiry_date || daysUntil(c.expiry_date) > c.alert_days_before)

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-xl" />)}
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-text-primary">Certificates & Credentials</h3>
          <p className="text-xs text-text-muted mt-0.5">Police clearance, food handler, fitness-to-work and other credentials</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Certificate
        </button>
      </div>

      {/* Alerts */}
      {(expired.length > 0 || expiring.length > 0) && (
        <div className="space-y-2">
          {expired.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">
                <span className="font-semibold">{expired.length} expired.</span> Arrange renewal immediately.
              </p>
            </div>
          )}
          {expiring.length > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{expiring.length} expiring soon.</span> Renewal required within the alert window.
              </p>
            </div>
          )}
        </div>
      )}

      {certs.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 py-14 text-center">
          <div className="w-14 h-14 rounded-full bg-surface-alt flex items-center justify-center">
            <Award className="w-7 h-7 text-text-muted" />
          </div>
          <p className="text-sm font-medium text-text-primary">No certificates tracked yet</p>
          <p className="text-xs text-text-muted max-w-xs">Add police clearance, food handler certificates, and other credentials for this employee.</p>
          <button onClick={() => setModal(true)} className="btn-primary text-sm px-5 mt-1">Track First Certificate</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {certs.map(cert => {
            const days = cert.expiry_date ? daysUntil(cert.expiry_date) : null
            const isExpired = days !== null && days < 0
            const isExpiring = days !== null && days >= 0 && days <= cert.alert_days_before
            const isValid = days === null || days > cert.alert_days_before

            return (
              <div
                key={cert.id}
                className={cn(
                  'card border-2',
                  isExpired ? 'border-red-200' : isExpiring ? 'border-amber-200' : 'border-green-200/60'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      'w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                      isExpired ? 'bg-red-50' : isExpiring ? 'bg-amber-50' : 'bg-green-50'
                    )}>
                      {isValid
                        ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                        : <AlertTriangle className={cn('w-4 h-4', isExpired ? 'text-red-600' : 'text-amber-600')} />
                      }
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-text-primary">{cert.name}</p>
                      <p className="text-xs text-text-muted">{cert.issuer || 'Unknown issuer'}</p>
                    </div>
                  </div>
                  {cert.expiry_date && (
                    <span className={cn(
                      'text-xs px-2 py-0.5 rounded-full border font-medium',
                      isExpired ? 'bg-red-50 text-red-700 border-red-200'
                        : isExpiring ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-green-50 text-green-700 border-green-200'
                    )}>
                      {isExpired ? `Expired ${Math.abs(days!)}d ago` : `${days}d left`}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs text-text-muted">
                  {cert.certificate_number && (
                    <p>No. <span className="font-mono text-text-body">{cert.certificate_number}</span></p>
                  )}
                  {cert.issue_date && <p>Issued: {new Date(cert.issue_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  {cert.expiry_date && <p>Expires: {new Date(cert.expiry_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}</p>}
                  {!cert.expiry_date && <p className="text-green-600">No expiry date</p>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AddCertModal open={modal} employeeId={employeeId} onClose={() => setModal(false)} />
    </div>
  )
}
