'use client'

import { Calendar, Wallet, TrendingUp, CheckSquare, Bell } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useInView } from 'react-intersection-observer'
import dayjs from 'dayjs'
import { Swiper, SwiperSlide } from 'swiper/react'
import { Pagination } from 'swiper/modules'
import 'swiper/css'
import 'swiper/css/pagination'
import { useMe } from '@/lib/hooks/use-me'
import { useLeaveBalances } from '@/lib/hooks/use-leave-pwa'
import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import { t } from '@hr/i18n'
import { LottieEmpty } from '@/components/mobile/lottie-empty'

function useAnnouncements() {
  return useQuery({
    queryKey: ['me', 'announcements'],
    queryFn: async () => {
      const res = await fetch('/api/me/announcements')
      if (!res.ok) return []
      const { data } = await res.json()
      return data ?? []
    },
  })
}

function daysUntilPayday() {
  const now = new Date()
  const payday = new Date(now.getFullYear(), now.getMonth(), 20)
  if (payday <= now) payday.setMonth(payday.getMonth() + 1)
  return Math.ceil((payday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function AnnouncementCard({ a, index, lang }: { a: any; index: number; lang: string }) {
  const shouldReduce = useReducedMotion()
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.1 })
  return (
    <motion.div
      ref={ref}
      initial={shouldReduce ? false : { opacity: 0, y: 16 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
      transition={{ delay: index * 0.05, type: 'spring', stiffness: 280, damping: 22 }}
      className={`rounded-2xl bg-white flex gap-3 p-4 ${a.priority === 'urgent' ? 'border-l-4 border-danger' : ''}`}
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      <Bell className={`w-5 h-5 mt-0.5 flex-shrink-0 ${a.priority === 'urgent' ? 'text-danger' : 'text-primary'}`} />
      <div>
        <p className="font-semibold text-text-primary text-sm">{a.title}</p>
        <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{a.body}</p>
      </div>
    </motion.div>
  )
}

export default function HomePage() {
  const lang = useStore((s) => s.language)
  const shouldReduce = useReducedMotion()
  const { data: me } = useMe()
  const { data: balances } = useLeaveBalances()
  const { data: announcements } = useAnnouncements()

  const firstName = me?.user?.full_name?.split(' ')[0] ?? '...'
  const annualBalance = balances?.find((b) => b.leave_type === 'annual')?.remaining_days ?? '—'

  const stats = [
    {
      label: t(lang, 'home.leave_balance'),
      value: annualBalance === '—' ? '—' : `${annualBalance}`,
      unit: t(lang, 'leave.working_days'),
      icon: Calendar,
      gradient: 'linear-gradient(135deg, #F47920, #E8650A)',
      glow: '0 4px 10px rgba(244,121,32,0.30)',
    },
    {
      label: t(lang, 'home.next_payday'),
      value: `${daysUntilPayday()}`,
      unit: t(lang, 'leave.working_days'),
      icon: Wallet,
      gradient: 'linear-gradient(135deg, #22C55E, #16A34A)',
      glow: '0 4px 10px rgba(34,197,94,0.30)',
    },
    {
      label: t(lang, 'home.kpi_score'),
      value: '—',
      unit: '',
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #1A2E5A, #2A4A8A)',
      glow: '0 4px 10px rgba(26,46,90,0.25)',
    },
    {
      label: t(lang, 'home.attendance_streak'),
      value: '—',
      unit: '',
      icon: CheckSquare,
      gradient: 'linear-gradient(135deg, #EAB308, #CA9A07)',
      glow: '0 4px 10px rgba(234,179,8,0.30)',
    },
  ]

  const quickActions = [
    {
      label: t(lang, 'actions.request_leave'),
      href: '/leave',
      icon: Calendar,
      gradient: 'linear-gradient(135deg, #F47920, #E8650A)',
      glow: '0 4px 12px rgba(244,121,32,0.35)',
    },
    {
      label: t(lang, 'actions.check_in'),
      href: '/attendance',
      icon: CheckSquare,
      gradient: 'linear-gradient(135deg, #22C55E, #16A34A)',
      glow: '0 4px 12px rgba(34,197,94,0.35)',
    },
    {
      label: t(lang, 'nav.payslip'),
      href: '/payslip',
      icon: Wallet,
      gradient: 'linear-gradient(135deg, #1A2E5A, #2A4A8A)',
      glow: '0 4px 12px rgba(26,46,90,0.25)',
    },
    {
      label: t(lang, 'nav.profile'),
      href: '/profile',
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #EAB308, #CA9A07)',
      glow: '0 4px 12px rgba(234,179,8,0.35)',
    },
  ]

  return (
    <div className="px-4 pt-6 space-y-6 pb-4">
      {/* Greeting card */}
      <motion.div
        className="relative overflow-hidden rounded-3xl p-6 text-white"
        style={{ background: 'linear-gradient(135deg, #1A2E5A 0%, #0D1B3E 100%)' }}
        initial={shouldReduce ? false : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div
          className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(244,121,32,0.15) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}
        />
        <div
          className="absolute bottom-0 left-0 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.04) 0%, transparent 70%)', transform: 'translate(-20%, 20%)' }}
        />
        <p className="text-white/60 text-sm font-medium relative z-10">{t(lang, 'greeting.hello')},</p>
        <h1 className="text-2xl font-black mt-0.5 tracking-tight relative z-10">{firstName}</h1>
        <div className="flex items-center gap-2 mt-3 relative z-10">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white/80">
            {new Date().toLocaleDateString('en-KE', { weekday: 'long' })}
          </span>
          <span className="text-white/40 text-xs">{dayjs().format('D MMMM YYYY')}</span>
        </div>
        {me?.employee?.company?.name && (
          <p className="text-white/30 text-xs mt-2 relative z-10">{me.employee.company.name}</p>
        )}
      </motion.div>

      {/* Quick stats — Swiper carousel */}
      <div className="-mx-4">
        <Swiper
          modules={[Pagination]}
          slidesPerView={2.2}
          spaceBetween={12}
          slidesOffsetBefore={16}
          slidesOffsetAfter={16}
          pagination={{ clickable: true, dynamicBullets: true }}
          grabCursor
          className="!pb-8"
        >
          {stats.map(({ label, value, unit, icon: Icon, gradient, glow }, i) => (
            <SwiperSlide key={label}>
              <motion.div
                initial={shouldReduce ? false : { opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07, type: 'spring', stiffness: 300, damping: 22 }}
                className="rounded-2xl bg-white p-4"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ background: gradient, boxShadow: glow }}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
                <p className="text-xl font-black text-text-primary tabular-nums">{value}</p>
                <p className="text-[11px] text-text-muted mt-0.5 leading-tight">{label}</p>
              </motion.div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="font-semibold text-text-primary mb-3">{t(lang, 'home.quick_actions')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map(({ label, href, icon: Icon, gradient, glow }, i) => (
            <motion.a
              key={href}
              href={href}
              initial={shouldReduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, type: 'spring', stiffness: 280, damping: 22 }}
              whileTap={{ scale: 0.93 }}
              className="rounded-2xl bg-white flex flex-col items-center justify-center py-6 gap-3"
              style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: gradient, boxShadow: glow }}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-[13px] font-semibold text-text-primary text-center px-2">{label}</p>
            </motion.a>
          ))}
        </div>
      </div>

      {/* Announcements */}
      <div>
        <h2 className="font-semibold text-text-primary mb-3">{t(lang, 'home.announcements')}</h2>
        {!announcements?.length ? (
          <div className="rounded-2xl bg-white" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <LottieEmpty message={t(lang, 'home.no_announcements')} />
          </div>
        ) : (
          <div className="space-y-3">
            {(announcements as any[]).map((a: any, i: number) => (
              <AnnouncementCard key={a.id} a={a} index={i} lang={lang} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
