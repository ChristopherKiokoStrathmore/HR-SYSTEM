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
import { DoorOpen, Plus, CheckCircle2, Circle, Calculator, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const KINDS: Record<string, string> = {
  resignation: 'Resignation',
  termination: 'Termination',
  redundancy: 'Redundancy',
  contract_end: 'Contract End',
  retirement: 'Retirement',
}

const STATUS_STYLES: Record<string, string> = {
  initiated: 'bg-amber-50 text-amber-700 border-amber-200',
  clearance: 'bg-blue-50 text-blue-700 border-blue-200',
  final_dues: 'bg-purple-50 text-purple-700 border-purple-200',
  completed: 'bg-green-50 text-green-700 border-green-200',
  cancelled: 'bg-gray-50 text-gray-600 border-gray-200',
}

interface ClearanceItem {
  id: string
  item: string
  is_cleared: boolean
}

interface EmployeeExit {
  id: string
  employee_id: string
  kind: string
  status: string
  reason: string
  notice_date: string | null
  last_working_day: string | null
  final_dues: Record<string, string>
  final_dues_total: string | null
  clearance_items: ClearanceItem[]
}

const exitSchema = z.object({
  employee_id: z.string().uuid('Select an employee'),
  kind: z.string().min(1),
  reason: z.string().optional(),
  notice_date: z.string().optional(),
  last_working_day: z.string().optional(),
})
type ExitForm = z.infer<typeof exitSchema>

const duesSchema = z.object({
  prorata_days: z.coerce.number().min(0).default(0),
  accrued_leave_days: z.coerce.number().min(0).default(0),
  notice_pay: z.coerce.number().min(0).default(0),
  service_pay: z.coerce.number().min(0).default(0),
})
type DuesForm = z.infer<typeof duesSchema>

function InitiateExitModal({ open, companyId, onClose }: { open: boolean; companyId: string | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: empData } = useQuery({
    queryKey: ['employees-list', companyId],
    queryFn: async () => (await fetch(`/api/employees?companyId=${companyId}&pageSize=200`)).json(),
    enabled: !!companyId,
  })
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<ExitForm>({
    resolver: zodResolver(exitSchema),
    defaultValues: { kind: 'resignation' },
  })

  const create = useMutation({
    mutationFn: async (body: ExitForm) => {
      const res = await fetch('/api/hr/exits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, company_id: companyId, notice_date: body.notice_date || null, last_working_day: body.last_working_day || null }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to initiate exit')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exits'] })
      toast.success('Exit initiated — clearance checklist created')
      reset()
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open={open} onClose={onClose} title="Initiate Employee Exit" size="md">
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
            <label className="block text-sm font-medium text-text-body mb-1.5">Exit Type *</label>
            <select className="input" {...register('kind')}>
              {Object.entries(KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Notice Date</label>
            <input type="date" className="input" {...register('notice_date')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Last Working Day</label>
            <input type="date" className="input" {...register('last_working_day')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Reason</label>
          <textarea className="input min-h-[60px]" {...register('reason')} />
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Initiate Exit
          </button>
        </div>
      </form>
    </Modal>
  )
}

function FinalDuesModal({ exit, onClose }: { exit: EmployeeExit | null; onClose: () => void }) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { isSubmitting } } = useForm<DuesForm>({
    resolver: zodResolver(duesSchema),
  })
  const compute = useMutation({
    mutationFn: async (body: DuesForm) => {
      const res = await fetch(`/api/hr/exits/${exit!.id}/compute_final_dues`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Computation failed')
      return res.json()
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['exits'] })
      toast.success(`Final dues: KES ${Number(data.final_dues_total).toLocaleString()}`)
      onClose()
    },
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <Modal open={!!exit} onClose={onClose} title="Compute Final Dues" size="sm">
      <form onSubmit={handleSubmit(v => compute.mutateAsync(v))} className="space-y-4">
        <p className="text-xs text-text-muted">
          Per the Employment Act: pro-rata salary, accrued leave pay, notice pay and
          service pay (where applicable). Daily rate derived from monthly salary / 30.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Pro-rata days worked</label>
            <input type="number" step="0.5" className="input" {...register('prorata_days')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Accrued leave days</label>
            <input type="number" step="0.5" className="input" {...register('accrued_leave_days')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Notice pay (KES)</label>
            <input type="number" step="0.01" className="input" {...register('notice_pay')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Service pay (KES)</label>
            <input type="number" step="0.01" className="input" {...register('service_pay')} />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />} Compute
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function ExitsClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const [duesFor, setDuesFor] = useState<EmployeeExit | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['exits', activeCompanyId],
    queryFn: async () => {
      const params = activeCompanyId ? `?company_id=${activeCompanyId}` : ''
      const res = await fetch(`/api/hr/exits${params}`)
      if (!res.ok) return { results: [] }
      return res.json()
    },
    staleTime: 30 * 1000,
  })
  const exits: EmployeeExit[] = data?.results ?? data ?? []

  const clearItem = useMutation({
    mutationFn: async ({ exitId, itemId }: { exitId: string; itemId: string }) => {
      const res = await fetch(`/api/hr/exits/${exitId}/clear_item`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: itemId }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to clear item')
      return res.json()
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exits'] }),
    onError: (e: Error) => toast.error(e.message),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Exiting Employees</h1>
          <p className="text-sm text-text-muted mt-0.5">Resignations, terminations, clearance and final dues</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Initiate Exit
        </button>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : exits.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <DoorOpen className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No exits in progress.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {exits.map(exit => {
              const cleared = exit.clearance_items?.filter(i => i.is_cleared).length ?? 0
              const total = exit.clearance_items?.length ?? 0
              return (
                <div key={exit.id} className="px-4 py-3">
                  <div className="flex items-center gap-4 cursor-pointer"
                       onClick={() => setExpanded(expanded === exit.id ? null : exit.id)}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary">{KINDS[exit.kind] ?? exit.kind}</p>
                      <p className="text-xs text-text-muted">
                        Clearance {cleared}/{total}
                        {exit.last_working_day && ` · last day ${exit.last_working_day}`}
                        {exit.final_dues_total && ` · final dues KES ${Number(exit.final_dues_total).toLocaleString()}`}
                      </p>
                    </div>
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border', STATUS_STYLES[exit.status] ?? '')}>
                      {exit.status.replace('_', ' ')}
                    </span>
                    {exit.status === 'final_dues' && !exit.final_dues_total && (
                      <button onClick={(e) => { e.stopPropagation(); setDuesFor(exit) }}
                              className="btn-ghost text-xs flex items-center gap-1">
                        <Calculator className="w-3.5 h-3.5" /> Final dues
                      </button>
                    )}
                  </div>
                  {expanded === exit.id && (
                    <div className="mt-3 pl-1 space-y-1.5">
                      {(exit.clearance_items ?? []).map(item => (
                        <button
                          key={item.id}
                          disabled={item.is_cleared || clearItem.isPending}
                          onClick={() => clearItem.mutate({ exitId: exit.id, itemId: item.id })}
                          className="flex items-center gap-2 text-sm text-text-body disabled:opacity-70"
                        >
                          {item.is_cleared
                            ? <CheckCircle2 className="w-4 h-4 text-green-600" />
                            : <Circle className="w-4 h-4 text-border" />}
                          {item.item}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <InitiateExitModal open={modal} companyId={activeCompanyId} onClose={() => setModal(false)} />
      <FinalDuesModal exit={duesFor} onClose={() => setDuesFor(null)} />
    </div>
  )
}
