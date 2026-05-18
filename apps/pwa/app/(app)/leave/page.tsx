'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, ChevronDown } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { Drawer } from 'vaul'
import { toast } from 'sonner'
import { CircularProgressbar, buildStyles } from 'react-circular-progressbar'
import 'react-circular-progressbar/dist/styles.css'
import { useLeaveBalances, useLeaveRequests, useRequestLeave } from '@/lib/hooks/use-leave-pwa'
import { useStore } from '@/lib/store'
import { t } from '@hr/i18n'
import { LottieEmpty } from '@/components/mobile/lottie-empty'

const LEAVE_TYPES = ['annual', 'sick', 'maternity', 'paternity', 'study', 'compassionate', 'unpaid', 'adoption', 'family'] as const

const schema = z.object({
  leave_type: z.enum(LEAVE_TYPES),
  start_date: z.string().min(1),
  end_date: z.string().min(1),
  reason: z.string().min(10, 'Please provide at least 10 characters'),
}).refine((d) => d.end_date >= d.start_date, { message: 'End date must be after start date', path: ['end_date'] })

type FormValues = z.infer<typeof schema>

function calcDays(start: string, end: string) {
  if (!start || !end) return 0
  const diff = (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)
  return Math.max(1, Math.round(diff) + 1)
}

const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:   { bg: 'rgba(234,179,8,0.12)',  text: '#EAB308' },
  approved:  { bg: 'rgba(34,197,94,0.12)',  text: '#22C55E' },
  rejected:  { bg: 'rgba(239,68,68,0.12)',  text: '#EF4444' },
  cancelled: { bg: 'rgba(226,232,240,0.8)', text: '#6B7280' },
}

const BALANCE_COLORS = ['#F47920', '#22C55E', '#1A2E5A', '#EAB308']

export default function LeavePage() {
  const lang = useStore((s) => s.language)
  const shouldReduce = useReducedMotion()
  const [modalOpen, setModalOpen] = useState(false)
  const { data: balances } = useLeaveBalances()
  const { data: requests } = useLeaveRequests()
  const requestLeave = useRequestLeave()

  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { leave_type: 'annual' },
  })

  const start = watch('start_date')
  const end = watch('end_date')
  const days = calcDays(start, end)

  async function onSubmit(values: FormValues) {
    try {
      await requestLeave.mutateAsync({ ...values, days_requested: days })
      toast.success('Leave request submitted!', { description: 'You will be notified once it is reviewed.' })
      reset()
      setModalOpen(false)
    } catch {
      toast.error('Failed to submit leave request. Please try again.')
      setModalOpen(false)
    }
  }

  const mainBalances = ['annual', 'sick', 'study']
  const displayBalances = balances?.filter((b) => mainBalances.includes(b.leave_type)) ?? []

  return (
    <div className="px-4 pt-6 space-y-5 pb-4">
      <motion.h1
        className="text-2xl font-black text-text-primary tracking-tight"
        initial={shouldReduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {t(lang, 'nav.leave')}
      </motion.h1>

      {/* Balance cards — circular progress rings */}
      <div className="grid grid-cols-3 gap-3">
        {(displayBalances.length > 0 ? displayBalances : mainBalances.map((type) => ({ leave_type: type, remaining_days: 0, entitled_days: 20 }))).map((b, i) => {
          const entitled = (b as any).entitled_days ?? 20
          const remaining = (b as any).remaining_days ?? 0
          const pct = entitled > 0 ? Math.round((remaining / entitled) * 100) : 0
          const color = BALANCE_COLORS[i] ?? '#1A2E5A'
          return (
            <motion.div
              key={b.leave_type}
              initial={shouldReduce ? false : { opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 280, damping: 20 }}
              className="rounded-2xl bg-white p-4 flex flex-col items-center gap-2"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <div className="w-16 h-16">
                <CircularProgressbar
                  value={pct}
                  text={`${remaining}`}
                  styles={buildStyles({
                    textSize: '28px',
                    textColor: color,
                    pathColor: color,
                    trailColor: '#F0F4F8',
                    strokeLinecap: 'round',
                  })}
                />
              </div>
              <p className="text-[11px] font-semibold text-text-muted text-center leading-tight">
                {t(lang, `leave_types.${b.leave_type}`)}
              </p>
            </motion.div>
          )
        })}
      </div>

      {/* Request button */}
      <motion.button
        onClick={() => setModalOpen(true)}
        whileTap={{ scale: 0.97 }}
        className="w-full h-14 text-white font-bold text-base rounded-2xl flex items-center justify-center gap-2 focus:outline-none"
        style={{ background: 'linear-gradient(135deg, #F47920, #E8650A)', boxShadow: '0 4px 16px rgba(244,121,32,0.35)' }}
      >
        + {t(lang, 'actions.request_leave')}
      </motion.button>

      {/* My requests */}
      <div>
        <h2 className="font-semibold text-text-primary mb-3">{t(lang, 'leave.my_requests')}</h2>
        {!requests?.length ? (
          <div className="rounded-2xl bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <LottieEmpty message={t(lang, 'leave.no_requests')} />
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req, i) => {
              const colors = STATUS_COLOR[req.status] ?? STATUS_COLOR.cancelled
              return (
                <motion.div
                  key={req.id}
                  initial={shouldReduce ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl bg-white p-4"
                  style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-text-primary">{t(lang, `leave_types.${req.leave_type}`)}</p>
                      <p className="text-sm text-text-muted mt-0.5">
                        {req.start_date} → {req.end_date} · {req.days_requested} {req.days_requested !== 1 ? t(lang, 'leave.working_days') : t(lang, 'leave.working_day')}
                      </p>
                      {req.rejection_reason && (
                        <p className="text-xs text-danger mt-1">{req.rejection_reason}</p>
                      )}
                    </div>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wide whitespace-nowrap ml-2"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {t(lang, `status.${req.status}`) ?? req.status}
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </div>

      {/* Request drawer — Vaul */}
      {modalOpen && (
      <Drawer.Root open={modalOpen} onOpenChange={setModalOpen}>
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
          <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[92vh] overflow-y-auto focus:outline-none">
            <div className="p-6 space-y-4">
              {/* Handle */}
              <div className="w-10 h-1 rounded-full bg-border mx-auto -mt-2 mb-2" />
              <div className="flex items-center justify-between">
                <Drawer.Title className="font-bold text-text-primary text-lg">{t(lang, 'actions.request_leave')}</Drawer.Title>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-xl hover:bg-surface-alt text-text-muted">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-text-body block mb-1.5">{t(lang, 'leave.leave_type')}</label>
                  <div className="relative">
                    <select {...register('leave_type')} className="input appearance-none pr-8">
                      {LEAVE_TYPES.map((lt) => (
                        <option key={lt} value={lt}>{t(lang, `leave_types.${lt}`) || lt}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-text-body block mb-1.5">{t(lang, 'leave.start_date')}</label>
                    <input type="date" {...register('start_date')} className="input" />
                    {errors.start_date && <p className="text-xs text-danger mt-1">{errors.start_date.message}</p>}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-text-body block mb-1.5">{t(lang, 'leave.end_date')}</label>
                    <input type="date" {...register('end_date')} className="input" />
                    {errors.end_date && <p className="text-xs text-danger mt-1">{errors.end_date.message}</p>}
                  </div>
                </div>

                {days > 0 && (
                  <p className="text-sm font-semibold" style={{ color: '#F47920' }}>
                    {days} {days !== 1 ? t(lang, 'leave.working_days') : t(lang, 'leave.working_day')}
                  </p>
                )}

                <div>
                  <label className="text-sm font-medium text-text-body block mb-1.5">{t(lang, 'leave.reason')}</label>
                  <textarea {...register('reason')} rows={3} className="input resize-none" placeholder={t(lang, 'leave.reason_placeholder')} />
                  {errors.reason && <p className="text-xs text-danger mt-1">{errors.reason.message}</p>}
                </div>

                <motion.button
                  type="submit"
                  disabled={requestLeave.isPending}
                  whileTap={{ scale: 0.97 }}
                  className="w-full h-14 text-white font-bold rounded-2xl disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #F47920, #E8650A)', boxShadow: '0 4px 16px rgba(244,121,32,0.3)' }}
                >
                  {requestLeave.isPending ? t(lang, 'actions.submitting') : t(lang, 'actions.submit')}
                </motion.button>
              </form>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
      )}
    </div>
  )
}
