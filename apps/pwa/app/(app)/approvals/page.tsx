'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Drawer } from 'vaul'
import { Clock4, Undo2, CheckCircle2, XCircle, Plus, X } from 'lucide-react'

/**
 * Requests & Approvals (01-Jun session):
 *  - Employees: request overtime; recall their approved leave.
 *  - Managers: one-tap approve/reject pending overtime and leave recalls.
 * Payroll data never appears here — the backend denies it for managers
 * regardless of UI.
 */

interface Overtime {
  id: string
  employee_id: string
  date: string
  hours: string
  reason: string
  status: string
}

interface Recall {
  id: string
  employee_id: string
  resume_date: string
  reason: string
  status: string
}

const overtimeSchema = z.object({
  date: z.string().min(1, 'Date required'),
  hours: z.coerce.number().min(0.5).max(12),
  reason: z.string().min(5, 'Give a short reason'),
})
type OvertimeForm = z.infer<typeof overtimeSchema>

interface MyLeave {
  id: string
  leave_type: string
  start_date: string
  end_date: string
  status: string
}

/** Employee-side leave recall: pick an approved leave, request early resumption. */
function RecallSection() {
  const qc = useQueryClient()
  const [recalling, setRecalling] = useState<MyLeave | null>(null)
  const [resumeDate, setResumeDate] = useState('')
  const [reason, setReason] = useState('')

  const { data: approvedLeaves } = useQuery({
    queryKey: ['my-approved-leaves'],
    queryFn: async () => {
      const res = await fetch('/api/me/leave?status=approved')
      if (!res.ok) return []
      const json = await res.json()
      return (json.data ?? json) as MyLeave[]
    },
  })

  const recall = useMutation({
    mutationFn: async () => {
      if (!resumeDate) throw new Error('Pick a resumption date')
      const res = await fetch('/api/hr/leave-recalls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leave_id: recalling!.id,
          employee_id: 'self', // stamped server-side from the session
          resume_date: resumeDate,
          reason,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Recall request failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries()
      toast.success('Recall requested — your manager has been notified')
      setRecalling(null)
      setResumeDate('')
      setReason('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const active = (approvedLeaves ?? []).filter(l =>
    new Date(l.end_date) >= new Date(new Date().toDateString()))
  if (active.length === 0) return null

  return (
    <Section title="Recall my leave" icon={Undo2}>
      {active.map(l => (
        <div key={l.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-[#1A2E5A] capitalize">{l.leave_type} leave</p>
            <p className="text-xs text-gray-500">{l.start_date} → {l.end_date}</p>
          </div>
          <button onClick={() => { setRecalling(l); setResumeDate('') }}
                  className="text-sm font-medium text-[#F47920] border border-[#F47920]/30 rounded-full px-3 py-1.5">
            Recall
          </button>
        </div>
      ))}

      <Drawer.Root open={!!recalling} onOpenChange={(o) => !o && setRecalling(null)}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <Drawer.Title className="text-lg font-bold text-[#1A2E5A]">Recall Leave</Drawer.Title>
              <button onClick={() => setRecalling(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Resume work on</label>
                <input type="date" value={resumeDate} onChange={e => setResumeDate(e.target.value)}
                       min={new Date().toISOString().slice(0, 10)}
                       className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                          className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[60px]"
                          placeholder="Needed back for the audit…" />
              </div>
              <button onClick={() => recall.mutate()} disabled={recall.isPending}
                      className="w-full bg-[#F47920] text-white font-semibold rounded-xl py-3 disabled:opacity-60">
                {recall.isPending ? 'Sending…' : 'Request recall — manager approves'}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </Section>
  )
}

function Section({ title, icon: Icon, children }: {
  title: string
  icon: typeof Clock4
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-[#1A2E5A]">
        <Icon className="w-4 h-4" /> {title}
      </h2>
      {children}
    </section>
  )
}

export default function ApprovalsPage() {
  const qc = useQueryClient()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // My overtime requests + (for managers) my pending approval queue
  const { data: myOvertime } = useQuery({
    queryKey: ['my-overtime'],
    queryFn: async () => {
      const res = await fetch('/api/hr/overtime')
      if (!res.ok) return []
      const json = await res.json()
      return (json.results ?? json) as Overtime[]
    },
  })

  const { data: pendingQueue } = useQuery({
    queryKey: ['manager-pending-overtime'],
    queryFn: async () => {
      const res = await fetch('/api/hr/overtime/pending_for_manager')
      if (!res.ok) return []
      return (await res.json()) as Overtime[]
    },
  })

  const { data: pendingRecalls } = useQuery({
    queryKey: ['manager-pending-recalls'],
    queryFn: async () => {
      const res = await fetch('/api/hr/leave-recalls?status=pending')
      if (!res.ok) return []
      const json = await res.json()
      return (json.results ?? json) as Recall[]
    },
  })

  const decide = useMutation({
    mutationFn: async ({ kind, id, verb }: { kind: 'overtime' | 'leave-recalls'; id: string; verb: 'approve' | 'reject' }) => {
      const res = await fetch(`/api/hr/${kind}/${id}/${verb}`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json()).error ?? `${verb} failed`)
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries()
      toast.success('Decision recorded')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<OvertimeForm>({
    resolver: zodResolver(overtimeSchema),
  })

  const requestOvertime = useMutation({
    mutationFn: async (body: OvertimeForm) => {
      const res = await fetch('/api/hr/overtime', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // employee_id stamped server-side from the session
        body: JSON.stringify({ ...body, employee_id: 'self' }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Request failed')
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-overtime'] })
      toast.success('Overtime requested — your manager has been notified')
      reset()
      setDrawerOpen(false)
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const statusChip = (status: string) => (
    <span className="text-[11px] px-2 py-0.5 rounded-full"
          style={status === 'approved' ? { background: 'rgba(34,197,94,0.12)', color: '#22C55E' }
            : status === 'rejected' ? { background: 'rgba(239,68,68,0.12)', color: '#EF4444' }
            : { background: 'rgba(234,179,8,0.12)', color: '#EAB308' }}>
      {status}
    </span>
  )

  return (
    <div className="p-4 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1A2E5A]">Requests &amp; Approvals</h1>
        <button onClick={() => setDrawerOpen(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-white bg-[#F47920] rounded-full px-4 py-2">
          <Plus className="w-4 h-4" /> Overtime
        </button>
      </div>

      {(pendingQueue ?? []).length > 0 && (
        <Section title="Awaiting your approval (overtime)" icon={Clock4}>
          {(pendingQueue ?? []).map(ot => (
            <div key={ot.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
              <p className="text-sm font-medium text-[#1A2E5A]">{Number(ot.hours)}h on {ot.date}</p>
              {ot.reason && <p className="text-xs text-gray-500">{ot.reason}</p>}
              <div className="flex gap-2">
                <button onClick={() => decide.mutate({ kind: 'overtime', id: ot.id, verb: 'approve' })}
                        disabled={decide.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-[#22C55E] rounded-xl py-2.5">
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => decide.mutate({ kind: 'overtime', id: ot.id, verb: 'reject' })}
                        disabled={decide.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-[#EF4444] bg-red-50 rounded-xl py-2.5">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </Section>
      )}

      {(pendingRecalls ?? []).length > 0 && (
        <Section title="Awaiting your approval (leave recalls)" icon={Undo2}>
          {(pendingRecalls ?? []).map(r => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm space-y-2">
              <p className="text-sm font-medium text-[#1A2E5A]">Resume {r.resume_date}</p>
              {r.reason && <p className="text-xs text-gray-500">{r.reason}</p>}
              <div className="flex gap-2">
                <button onClick={() => decide.mutate({ kind: 'leave-recalls', id: r.id, verb: 'approve' })}
                        disabled={decide.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-white bg-[#22C55E] rounded-xl py-2.5">
                  <CheckCircle2 className="w-4 h-4" /> Approve
                </button>
                <button onClick={() => decide.mutate({ kind: 'leave-recalls', id: r.id, verb: 'reject' })}
                        disabled={decide.isPending}
                        className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium text-[#EF4444] bg-red-50 rounded-xl py-2.5">
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          ))}
        </Section>
      )}

      <Section title="My overtime" icon={Clock4}>
        {(myOvertime ?? []).length === 0 ? (
          <p className="text-sm text-gray-400">No overtime requests yet.</p>
        ) : (
          (myOvertime ?? []).map(ot => (
            <div key={ot.id} className="bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[#1A2E5A]">{Number(ot.hours)}h on {ot.date}</p>
                {ot.reason && <p className="text-xs text-gray-500">{ot.reason}</p>}
              </div>
              {statusChip(ot.status)}
            </div>
          ))
        )}
      </Section>

      <RecallSection />

      <Drawer.Root open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl p-5 pb-8">
            <div className="flex items-center justify-between mb-4">
              <Drawer.Title className="text-lg font-bold text-[#1A2E5A]">Request Overtime</Drawer.Title>
              <button onClick={() => setDrawerOpen(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit(v => requestOvertime.mutateAsync(v))} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" {...register('date')} />
                {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hours</label>
                <input type="number" step="0.5" min="0.5" max="12" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm" {...register('hours')} />
                {errors.hours && <p className="text-xs text-red-500 mt-1">{errors.hours.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                <textarea className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm min-h-[70px]"
                          placeholder="Month-end stock take…" {...register('reason')} />
                {errors.reason && <p className="text-xs text-red-500 mt-1">{errors.reason.message}</p>}
              </div>
              <button type="submit" disabled={isSubmitting}
                      className="w-full bg-[#F47920] text-white font-semibold rounded-xl py-3 disabled:opacity-60">
                {isSubmitting ? 'Sending…' : 'Submit — manager will be notified'}
              </button>
            </form>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  )
}
