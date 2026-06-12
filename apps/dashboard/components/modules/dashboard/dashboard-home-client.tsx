'use client'

import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import { Users, Clock, AlertTriangle, Calendar } from 'lucide-react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { useEffect } from 'react'
import NumberFlow from '@number-flow/react'
import { useInView } from 'react-intersection-observer'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

interface Summary {
  activeEmployees: number
  onLeaveToday: number
  contractExpiries: { id: string; user: { full_name: string } | null; job_title: string; end_date: string }[]
  pendingLeave: { id: string; leave_type: string; days_requested: number; start_date: string; end_date: string; employee: { user: { full_name: string } | null } | null }[]
}

function useSummary(companyId: string | null) {
  return useQuery<Summary>({
    queryKey: ['dashboard-summary', companyId],
    queryFn: async () => {
      const params = companyId ? `?companyId=${companyId}` : ''
      const res = await fetch(`/api/dashboard/summary${params}`)
      if (!res.ok) throw new Error('Failed')
      const { data } = await res.json()
      return data
    },
    staleTime: 60 * 1000,
  })
}

function daysUntil(dateStr: string) {
  return dayjs(dateStr).diff(dayjs(), 'day')
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
}

function PanelSection({ children }: { children: React.ReactNode }) {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.05 })
  const shouldReduce = useReducedMotion()
  return (
    <motion.div
      ref={ref}
      initial={shouldReduce ? false : { opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-6"
    >
      {children}
    </motion.div>
  )
}

export function DashboardHomeClient() {
  const companyId = useStore((s) => s.activeCompanyId)
  const { data } = useSummary(companyId)
  const prefersReducedMotion = useReducedMotion()

  useEffect(() => {
    if (data?.pendingLeave?.length) {
      toast.info(`${data.pendingLeave.length} leave request${data.pendingLeave.length > 1 ? 's' : ''} pending review`, {
        duration: 4000,
      })
    }
  }, [data?.pendingLeave?.length])

  const stats = [
    {
      label: 'Active Employees',
      value: data?.activeEmployees ?? 0,
      rawValue: data?.activeEmployees ?? '—',
      icon: Users,
      gradient: 'linear-gradient(135deg, #1A2E5A, #2A4A8A)',
      glow: '0 4px 12px rgba(26,46,90,0.3)',
    },
    {
      label: 'On Leave Today',
      value: data?.onLeaveToday ?? 0,
      rawValue: data?.onLeaveToday ?? '—',
      icon: Clock,
      gradient: 'linear-gradient(135deg, #EAB308, #CA9A07)',
      glow: '0 4px 12px rgba(234,179,8,0.3)',
    },
    {
      label: 'Contract Expiries',
      value: data?.contractExpiries?.length ?? 0,
      rawValue: data?.contractExpiries?.length ?? '—',
      icon: AlertTriangle,
      gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
      glow: '0 4px 12px rgba(239,68,68,0.3)',
    },
    {
      label: 'Pending Approvals',
      value: data?.pendingLeave?.length ?? 0,
      rawValue: data?.pendingLeave?.length ?? '—',
      icon: Calendar,
      gradient: 'linear-gradient(135deg, #F47920, #E8650A)',
      glow: '0 4px 12px rgba(244,121,32,0.3)',
    },
  ]

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={prefersReducedMotion ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-text-muted text-sm font-medium">{getGreeting()}</p>
        <h1 className="text-3xl font-black text-text-primary tracking-tight">Workforce Overview</h1>
        <div
          className="w-10 h-0.5 mt-2"
          style={{ background: 'linear-gradient(90deg, #F47920, #F9A05C)' }}
        />
      </motion.div>

      {/* Stat cards with stagger */}
      <motion.div
        variants={prefersReducedMotion ? undefined : containerVariants}
        initial={prefersReducedMotion ? false : 'hidden'}
        animate="show"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map(({ label, value, rawValue, icon: Icon, gradient, glow }) => {
          const hasData = data !== undefined
          return (
            <motion.div
              key={label}
              variants={prefersReducedMotion ? undefined : cardVariants}
              whileHover={prefersReducedMotion ? undefined : { y: -3 }}
              className="card"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: gradient, boxShadow: glow }}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div>
                  {hasData && typeof rawValue === 'number'
                    ? <NumberFlow value={rawValue} className="text-2xl font-black text-text-primary tabular-nums" />
                    : <p className="text-2xl font-black text-text-primary">—</p>
                  }
                  <p className="text-sm text-text-muted mt-0.5">{label}</p>
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Panels */}
      <PanelSection>
        {/* Contract expiries */}
        <div className="card">
          <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-danger" />
            Contract Expiry Alerts (Next 30 Days)
          </h2>
          {data !== undefined && !data?.contractExpiries?.length && (
            <p className="text-text-muted text-sm">No contracts expiring in the next 30 days.</p>
          )}
          <div className="space-y-2">
            {data?.contractExpiries?.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary">{c.user?.full_name ?? 'Unknown'}</p>
                  <p className="text-xs text-text-muted">{c.job_title}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-danger">{dayjs(c.end_date).format('D MMM YYYY')}</p>
                  <p className="text-xs text-text-muted">{daysUntil(c.end_date)} days</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pending leave */}
        <div className="card">
          <h2 className="text-base font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-accent" />
            Pending Leave Approvals
          </h2>
          {data !== undefined && !data?.pendingLeave?.length && (
            <p className="text-text-muted text-sm">No pending leave requests.</p>
          )}
          <div className="space-y-2">
            {data?.pendingLeave?.map((l) => (
              <div
                key={l.id}
                className="flex items-center justify-between py-1.5 border-b border-border last:border-0"
              >
                <div>
                  <p className="text-sm font-medium text-text-primary capitalize">
                    {l.employee?.user?.full_name ?? 'Unknown'} — {l.leave_type}
                  </p>
                  <p className="text-xs text-text-muted">
                    {l.start_date} → {l.end_date} · {l.days_requested} days
                  </p>
                </div>
                <Link href="/leave" className="text-xs text-primary hover:underline font-medium">
                  Review →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </PanelSection>
    </div>
  )
}
