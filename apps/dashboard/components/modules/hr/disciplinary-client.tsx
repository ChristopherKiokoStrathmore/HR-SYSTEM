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
import { Gavel, Plus, ArrowUpRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const KINDS: Record<string, string> = {
  pip: 'Performance Improvement Plan',
  verbal_warning: 'Verbal Warning',
  warning_letter: 'Warning Letter',
  salary_penalty: 'Salary Penalty',
  suspension: 'Suspension',
  termination_recommendation: 'Termination Recommendation',
  prior_employer_record: 'Prior Employer Record',
}

// Escalation chain enforced server-side (Employment Act flow); mirrored here
// so the UI only offers valid next steps.
const NEXT_KINDS: Record<string, string[]> = {
  pip: ['warning_letter'],
  verbal_warning: ['warning_letter'],
  warning_letter: ['salary_penalty', 'suspension', 'termination_recommendation'],
  salary_penalty: ['termination_recommendation'],
  suspension: ['termination_recommendation'],
}

const STATUS_STYLES: Record<string, string> = {
  open: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-green-50 text-green-700 border-green-200',
  escalated: 'bg-red-50 text-red-700 border-red-200',
}

interface DisciplinaryRecord {
  id: string
  employee_id: string
  kind: string
  status: string
  title: string
  description: string
  starts_on: string | null
  ends_on: string | null
  created_at: string
  escalated_from: string | null
}

const recordSchema = z.object({
  employee_id: z.string().uuid('Select an employee'),
  kind: z.string().min(1),
  title: z.string().min(3, 'Title required'),
  description: z.string().optional(),
  starts_on: z.string().optional(),
  ends_on: z.string().optional(),
})
type RecordForm = z.infer<typeof recordSchema>

function useEmployees(companyId: string | null) {
  return useQuery({
    queryKey: ['employees-list', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/employees?companyId=${companyId}&pageSize=200`)
      return res.json()
    },
    enabled: !!companyId,
  })
}

function AddRecordModal({ open, companyId, onClose }: { open: boolean; companyId: string | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: empData } = useEmployees(companyId)
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<RecordForm>({
    resolver: zodResolver(recordSchema),
    defaultValues: { kind: 'pip' },
  })

  const create = useMutation({
    mutationFn: async (body: RecordForm) => {
      const res = await fetch('/api/hr/disciplinary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, company_id: companyId, starts_on: body.starts_on || null, ends_on: body.ends_on || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to create record')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinary'] })
      toast.success('Disciplinary record created')
      reset()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open={open} onClose={onClose} title="New Disciplinary Record" size="md">
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
            <label className="block text-sm font-medium text-text-body mb-1.5">Type *</label>
            <select className="input" {...register('kind')}>
              {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Title *</label>
            <input className="input" placeholder="e.g. Q2 attendance PIP" {...register('title')} />
            {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Starts</label>
            <input type="date" className="input" {...register('starts_on')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Ends</label>
            <input type="date" className="input" {...register('ends_on')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Details</label>
          <textarea className="input min-h-[80px]" placeholder="Background, expectations, review cadence…" {...register('description')} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Create
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function DisciplinaryClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [escalating, setEscalating] = useState<DisciplinaryRecord | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['disciplinary', activeCompanyId],
    queryFn: async () => {
      const params = activeCompanyId ? `?company_id=${activeCompanyId}` : ''
      const res = await fetch(`/api/hr/disciplinary${params}`)
      if (!res.ok) return { results: [] }
      return res.json()
    },
    staleTime: 30 * 1000,
  })
  const records: DisciplinaryRecord[] = data?.results ?? data ?? []

  const escalate = useMutation({
    mutationFn: async ({ id, kind }: { id: string; kind: string }) => {
      const res = await fetch(`/api/hr/disciplinary/${id}/escalate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Escalation failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disciplinary'] })
      toast.success('Record escalated')
      setEscalating(null)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Disciplinary</h1>
          <p className="text-sm text-text-muted mt-0.5">
            PIP → warning → penalty → termination, per the Kenyan Employment Act
          </p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Record
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : records.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <Gavel className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No disciplinary records.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {records.map(rec => (
              <div key={rec.id} className="flex items-center gap-4 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">{rec.title}</p>
                  <p className="text-xs text-text-muted">{KINDS[rec.kind] ?? rec.kind}
                    {rec.starts_on && ` · from ${rec.starts_on}`}{rec.ends_on && ` to ${rec.ends_on}`}</p>
                </div>
                <span className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_STYLES[rec.status] ?? '')}>
                  {rec.status.replace('_', ' ')}
                </span>
                {NEXT_KINDS[rec.kind] && rec.status !== 'escalated' && rec.status !== 'resolved' && (
                  <button onClick={() => setEscalating(rec)} className="btn-ghost text-xs flex items-center gap-1">
                    <ArrowUpRight className="w-3.5 h-3.5" /> Escalate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AddRecordModal open={modal} companyId={activeCompanyId} onClose={() => setModal(false)} />

      <Modal open={!!escalating} onClose={() => setEscalating(null)} title="Escalate Record" size="sm">
        {escalating && (
          <div className="space-y-3">
            <p className="text-sm text-text-body">
              Escalate “{escalating.title}” ({KINDS[escalating.kind]}) to:
            </p>
            {(NEXT_KINDS[escalating.kind] ?? []).map(k => (
              <button
                key={k}
                disabled={escalate.isPending}
                onClick={() => escalate.mutate({ id: escalating.id, kind: k })}
                className="btn-ghost w-full justify-start border border-border"
              >
                {KINDS[k]}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </div>
  )
}
