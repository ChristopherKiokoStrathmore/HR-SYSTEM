'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { useStore } from '@/lib/store'
import { formatDate, isExpiringSoon, isExpired } from '@hr/shared'
import type { MedicalRecord } from '@hr/shared'
import { Heart, Plus, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MedicalWithEmployee extends MedicalRecord {
  employee: { employee_number: string; user: { full_name: string; avatar_url: string | null } }
}

const medSchema = z.object({
  employee_id: z.string().uuid(),
  record_type: z.string().min(2),
  fitness_status: z.enum(['fit', 'fit_with_conditions', 'unfit']),
  issued_by: z.string().optional(),
  issued_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  file_url: z.string().url('Must be a valid URL').optional().or(z.literal('')),
  notes: z.string().optional(),
})
type MedForm = z.infer<typeof medSchema>

function AddMedicalModal({ open, companyId, onClose }: { open: boolean; companyId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<MedForm>({
    resolver: zodResolver(medSchema),
    defaultValues: { fitness_status: 'fit', issued_date: new Date().toISOString().slice(0, 10) },
  })

  const { data: empData } = useQuery({
    queryKey: ['employees-list', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/employees?companyId=${companyId}&pageSize=200`)
      return res.json()
    },
    enabled: !!companyId,
  })

  const create = useMutation({
    mutationFn: async (body: MedForm) => {
      const res = await fetch('/api/medical', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, expiry_date: body.expiry_date || null, file_url: body.file_url || '' }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['medical-all'] })
      toast.success('Medical record added')
      reset()
      onClose()
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="Add Medical Record" size="md">
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
            <label className="block text-sm font-medium text-text-body mb-1.5">Record Type *</label>
            <input className="input" placeholder="Annual Medical / DOSH Certificate" {...register('record_type')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Fitness Status *</label>
            <select className="input" {...register('fitness_status')}>
              <option value="fit">Fit for Work</option>
              <option value="fit_with_conditions">Fit with Conditions</option>
              <option value="unfit">Unfit for Work</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Issued By</label>
            <input className="input" placeholder="Dr. Kamau / Nairobi Hospital" {...register('issued_by')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Issued Date *</label>
            <input type="date" className="input" {...register('issued_date')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Expiry Date</label>
            <input type="date" className="input" {...register('expiry_date')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Document URL</label>
            <input className="input" placeholder="https://…" {...register('file_url')} />
            {errors.file_url && <p className="text-xs text-danger mt-1">{errors.file_url.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Notes</label>
          <textarea className="input resize-none" rows={2} {...register('notes')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save Record
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function MedicalClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [modal, setModal] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['medical-all', activeCompanyId],
    queryFn: async () => {
      const params = activeCompanyId ? `?companyId=${activeCompanyId}` : ''
      const res = await fetch(`/api/medical/all${params}`)
      if (!res.ok) return { data: [] }
      return res.json() as Promise<{ data: MedicalWithEmployee[] }>
    },
    staleTime: 60 * 1000,
  })

  const records = data?.data ?? []
  const expiring = records.filter(r => r.expiry_date && isExpiringSoon(r.expiry_date, 30) && !isExpired(r.expiry_date)).length
  const expired = records.filter(r => r.expiry_date && isExpired(r.expiry_date)).length
  const unfit = records.filter(r => r.fitness_status === 'unfit').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Medical Records</h1>
          <p className="text-sm text-text-muted mt-0.5">{records.length} record{records.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Record
        </button>
      </div>

      {/* Alerts */}
      {(expiring > 0 || expired > 0 || unfit > 0) && (
        <div className="space-y-2">
          {expired > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">
                <span className="font-semibold">{expired} certificate{expired !== 1 ? 's' : ''} expired.</span> Arrange immediate renewal.
              </p>
            </div>
          )}
          {expiring > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{expiring} certificate{expiring !== 1 ? 's' : ''} expiring within 30 days.</span>
              </p>
            </div>
          )}
          {unfit > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">
                <span className="font-semibold">{unfit} employee{unfit !== 1 ? 's' : ''} currently unfit for work.</span>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">All Medical Records</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Heart className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No medical records yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {records.map((rec) => {
              const exp = rec.expiry_date ? isExpired(rec.expiry_date) : false
              const soon = rec.expiry_date ? isExpiringSoon(rec.expiry_date, 30) : false
              return (
                <div key={rec.id} className="flex items-center gap-4 px-4 py-3">
                  <Avatar
                    name={rec.employee?.user?.full_name ?? '?'}
                    src={rec.employee?.user?.avatar_url ?? undefined}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{rec.employee?.user?.full_name}</p>
                    <p className="text-xs text-text-muted capitalize">{rec.record_type} · Issued {formatDate(rec.issued_date)}</p>
                    {rec.expiry_date && (
                      <p className={cn('text-xs mt-0.5', exp ? 'text-red-600 font-medium' : soon ? 'text-amber-600 font-medium' : 'text-text-muted')}>
                        {exp ? 'Expired' : 'Expires'}: {formatDate(rec.expiry_date)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {rec.fitness_status === 'fit' ? (
                      <span className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-medium">
                        <CheckCircle className="w-3.5 h-3.5" /> Fit
                      </span>
                    ) : rec.fitness_status === 'fit_with_conditions' ? (
                      <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> Conditions
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> Unfit
                      </span>
                    )}
                    {exp && <AlertTriangle className="w-4 h-4 text-red-500" />}
                    {soon && !exp && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <AddMedicalModal
        open={modal}
        companyId={activeCompanyId ?? ''}
        onClose={() => setModal(false)}
      />
    </div>
  )
}
