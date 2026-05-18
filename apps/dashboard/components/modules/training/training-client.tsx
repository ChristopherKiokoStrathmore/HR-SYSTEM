'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTrainingSessions, useCreateTrainingSession } from '@/lib/hooks/use-training'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Modal } from '@/components/ui/modal'
import { toast } from '@/lib/toast'
import { useStore } from '@/lib/store'
import { formatDate } from '@hr/shared'
import type { TrainingSession } from '@hr/shared'
import { BookOpen, Plus, Calendar, User, Users, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const sessionSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  trainer_name: z.string().min(2),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  department: z.string().optional(),
  is_mandatory: z.boolean().default(false),
  company_id: z.string().uuid(),
})
type SessionForm = z.infer<typeof sessionSchema>

function SessionModal({ open, companyId, onClose }: { open: boolean; companyId: string; onClose: () => void }) {
  const create = useCreateTrainingSession()
  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<SessionForm>({
    resolver: zodResolver(sessionSchema),
    defaultValues: { is_mandatory: false, company_id: companyId },
  })

  async function onSubmit(values: SessionForm) {
    try {
      await create.mutateAsync(values)
      toast.success('Training session created')
      reset()
      onClose()
    } catch (e) {
      toast.error('Failed to create session', String(e))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Training Session" size="md">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('company_id')} />
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Title *</label>
          <input className="input" placeholder="First Aid & Safety" {...register('title')} />
          {errors.title && <p className="text-xs text-danger mt-1">{errors.title.message}</p>}
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Trainer *</label>
            <input className="input" placeholder="Jane Wanjiku" {...register('trainer_name')} />
            {errors.trainer_name && <p className="text-xs text-danger mt-1">{errors.trainer_name.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Department</label>
            <input className="input" placeholder="All / Engineering" {...register('department')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Start Date *</label>
            <input type="date" className="input" {...register('start_date')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">End Date *</label>
            <input type="date" className="input" {...register('end_date')} />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Description</label>
          <textarea className="input resize-none" rows={3} {...register('description')} />
        </div>
        <div className="flex items-center gap-3">
          <input type="checkbox" id="mandatory" {...register('is_mandatory')} className="w-4 h-4 accent-accent" />
          <label htmlFor="mandatory" className="text-sm text-text-body">Mandatory for all employees</label>
        </div>
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Session
          </button>
        </div>
      </form>
    </Modal>
  )
}

export function TrainingClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [modal, setModal] = useState(false)
  const { data, isLoading } = useTrainingSessions(activeCompanyId)
  const sessions = data?.data ?? []

  const upcoming = sessions.filter(s => s.start_date >= new Date().toISOString().slice(0, 10)).length
  const mandatory = sessions.filter(s => s.is_mandatory).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Training</h1>
          <p className="text-sm text-text-muted mt-0.5">{sessions.length} session{sessions.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Session
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Sessions', value: sessions.length, icon: BookOpen, color: 'text-primary' },
          { label: 'Upcoming', value: upcoming, icon: Calendar, color: 'text-accent' },
          { label: 'Mandatory', value: mandatory, icon: Users, color: 'text-red-600' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">Training Sessions</h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : sessions.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <BookOpen className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No training sessions yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {sessions.map((s) => <SessionRow key={s.id} session={s} />)}
          </div>
        )}
      </div>

      <SessionModal
        open={modal}
        companyId={activeCompanyId ?? ''}
        onClose={() => setModal(false)}
      />
    </div>
  )
}

function SessionRow({ session }: { session: TrainingSession }) {
  const today = new Date().toISOString().slice(0, 10)
  const upcoming = session.start_date > today
  const ongoing = session.start_date <= today && session.end_date >= today
  const past = session.end_date < today

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <div className={cn(
        'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
        upcoming ? 'bg-accent/10' : ongoing ? 'bg-green-50' : 'bg-surface-alt'
      )}>
        <BookOpen className={cn('w-5 h-5', upcoming ? 'text-accent' : ongoing ? 'text-green-600' : 'text-text-muted')} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-primary">{session.title}</p>
          {session.is_mandatory && (
            <span className="text-xs bg-red-50 text-red-700 px-1.5 py-0.5 rounded font-medium">Mandatory</span>
          )}
        </div>
        <div className="flex gap-3 mt-0.5 text-xs text-text-muted">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{session.trainer_name}</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(session.start_date)}
            {session.end_date !== session.start_date && ` – ${formatDate(session.end_date)}`}
          </span>
          {session.department && <span>{session.department}</span>}
        </div>
      </div>
      <span className={cn(
        'text-xs font-medium px-2.5 py-1 rounded-full',
        upcoming ? 'bg-accent/10 text-accent' :
        ongoing ? 'bg-green-50 text-green-700' :
        'bg-surface text-text-muted'
      )}>
        {upcoming ? 'Upcoming' : ongoing ? 'Ongoing' : 'Completed'}
      </span>
    </div>
  )
}
