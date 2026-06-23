'use client'

import { useQuery } from '@tanstack/react-query'
import { useStore } from '@/lib/store'
import { Users, Clock, AlertTriangle, Calendar } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useCallback } from 'react'
import NumberFlow from '@number-flow/react'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

// ── Types ──────────────────────────────────────────────────────────────────────

interface Summary {
  activeEmployees: number
  onLeaveToday: number
  contractExpiries: { id: string; user: { full_name: string } | null; job_title: string; end_date: string }[]
  pendingLeave: { id: string; leave_type: string; days_requested: number; start_date: string; end_date: string; employee: { user: { full_name: string } | null } | null }[]
}

// ── Data hook ─────────────────────────────────────────────────────────────────

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

// ── Helpers ───────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string) {
  return dayjs(dateStr).diff(dayjs(), 'day')
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Particle canvas background ────────────────────────────────────────────────

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Capture non-null references for closures so TS is satisfied
    const cvs = canvas
    const c2d = ctx

    const COLORS = {
      node: 'rgba(128,21,27,',      // primary crimson
      nodeMid: 'rgba(201,168,76,',  // gold
      line: 'rgba(128,21,27,',
    }

    const NODE_COUNT = 38
    const MAX_DIST = 140

    // Sizing
    let W = 0
    let H = 0

    type Node = {
      x: number; y: number
      vx: number; vy: number
      r: number
      hue: 'primary' | 'gold'
      opacity: number
      phase: number   // for individual bob
    }

    let nodes: Node[] = []

    function resize() {
      const rect = cvs.parentElement?.getBoundingClientRect()
      W = rect?.width ?? window.innerWidth
      H = rect?.height ?? 260
      cvs.width = W
      cvs.height = H
    }

    function spawnNodes() {
      nodes = Array.from({ length: NODE_COUNT }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        r: 1.5 + Math.random() * 2.5,
        hue: Math.random() > 0.78 ? 'gold' : 'primary',
        opacity: 0.25 + Math.random() * 0.55,
        phase: Math.random() * Math.PI * 2,
      }))
    }

    let t = 0

    function draw() {
      c2d.clearRect(0, 0, W, H)
      t += 0.008

      for (const n of nodes) {
        // Drift
        n.x += n.vx
        n.y += n.vy + Math.sin(t + n.phase) * 0.08

        // Wrap edges
        if (n.x < -10) n.x = W + 10
        if (n.x > W + 10) n.x = -10
        if (n.y < -10) n.y = H + 10
        if (n.y > H + 10) n.y = -10
      }

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i]
          const b = nodes[j]
          const dx = a.x - b.x
          const dy = a.y - b.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * 0.12
            c2d.beginPath()
            c2d.strokeStyle = `${COLORS.line}${alpha})`
            c2d.lineWidth = 0.6
            c2d.moveTo(a.x, a.y)
            c2d.lineTo(b.x, b.y)
            c2d.stroke()
          }
        }
      }

      // Draw nodes
      for (const n of nodes) {
        const colorBase = n.hue === 'gold' ? COLORS.nodeMid : COLORS.node
        c2d.beginPath()
        c2d.arc(n.x, n.y, n.r, 0, Math.PI * 2)
        c2d.fillStyle = `${colorBase}${n.opacity})`
        c2d.fill()
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    resize()
    spawnNodes()
    draw()

    const ro = new ResizeObserver(() => {
      resize()
    })
    if (cvs.parentElement) ro.observe(cvs.parentElement)

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full"
    />
  )
}

// ── Animated hero header ───────────────────────────────────────────────────────

function HeroHeader() {
  const headerRef = useRef<HTMLDivElement>(null)
  const greeting = getGreeting()

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // Dynamically import animejs (CJS-compatible default export)
    import('animejs/lib/anime.es.js').then((mod) => {
      const anime = mod.default ?? mod

      const el = headerRef.current
      if (!el) return

      // Split greeting into spans
      const greetEl = el.querySelector<HTMLElement>('[data-greet]')
      const titleEl = el.querySelector<HTMLElement>('[data-title]')
      const lineEl = el.querySelector<HTMLElement>('[data-line]')
      const subtitleEl = el.querySelector<HTMLElement>('[data-subtitle]')

      if (!greetEl || !titleEl || !lineEl) return

      // Wrap each character
      function wrapChars(node: HTMLElement) {
        const text = node.textContent ?? ''
        node.innerHTML = text
          .split('')
          .map((ch) =>
            ch === ' '
              ? '<span style="display:inline-block;width:0.3em"> </span>'
              : `<span class="char" style="display:inline-block;opacity:0;transform:translateY(14px)">${ch}</span>`
          )
          .join('')
        return node.querySelectorAll<HTMLElement>('.char')
      }

      const greetChars = wrapChars(greetEl)
      const titleChars = wrapChars(titleEl)

      const tl = anime.timeline({ easing: 'easeOutExpo' })

      tl.add({
        targets: greetChars,
        opacity: [0, 1],
        translateY: [12, 0],
        delay: anime.stagger(28, { start: 0 }),
        duration: 480,
      })
        .add({
          targets: titleChars,
          opacity: [0, 1],
          translateY: [18, 0],
          delay: anime.stagger(22, { start: 0 }),
          duration: 540,
        }, '-=300')
        .add({
          targets: lineEl,
          scaleX: [0, 1],
          opacity: [0, 1],
          duration: 500,
          easing: 'easeOutQuart',
        }, '-=200')
        .add({
          targets: subtitleEl,
          opacity: [0, 1],
          translateY: [8, 0],
          duration: 380,
          easing: 'easeOutCubic',
        }, '-=250')
    })
  }, [])

  return (
    <div ref={headerRef} className="relative">
      <p
        data-greet
        className="text-text-muted text-sm font-medium tracking-wide uppercase"
        style={{ willChange: 'transform, opacity' }}
      >
        {greeting}
      </p>
      <h1
        data-title
        className="text-3xl font-black text-text-primary tracking-tight mt-0.5"
        style={{ willChange: 'transform, opacity' }}
      >
        Workforce Overview
      </h1>
      <div
        data-line
        className="w-10 h-0.5 mt-2"
        style={{
          background: 'linear-gradient(90deg, #80151B, #C9A84C)',
          transformOrigin: 'left center',
          willChange: 'transform, opacity',
        }}
      />
      <p
        data-subtitle
        className="text-text-muted text-xs mt-1 opacity-0"
        style={{ willChange: 'transform, opacity' }}
      >
        {new Date().toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
      </p>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string
  value: number
  rawValue: number | string
  icon: React.ElementType
  gradient: string
  glow: string
  hasData: boolean
  index: number
}

function StatCard({ label, value, rawValue, icon: Icon, gradient, glow, hasData, index }: StatCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)

  // Hover glow micro-interaction
  const handleMouseEnter = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    import('animejs/lib/anime.es.js').then((mod) => {
      const anime = mod.default ?? mod
      if (!cardRef.current) return
      anime({
        targets: cardRef.current,
        boxShadow: ['0 2px 12px rgba(0,0,0,0.06)', '0 6px 28px rgba(128,21,27,0.18), 0 2px 8px rgba(201,168,76,0.10)'],
        translateY: [0, -3],
        duration: 220,
        easing: 'easeOutCubic',
      })
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    import('animejs/lib/anime.es.js').then((mod) => {
      const anime = mod.default ?? mod
      if (!cardRef.current) return
      anime({
        targets: cardRef.current,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        translateY: 0,
        duration: 280,
        easing: 'easeOutCubic',
      })
    })
  }, [])

  return (
    <div
      ref={cardRef}
      data-stat-card
      className="card cursor-default"
      style={{
        opacity: 0,
        transform: 'translateY(20px)',
        willChange: 'transform, opacity, box-shadow',
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
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
    </div>
  )
}

// ── Stats grid with stagger entrance ─────────────────────────────────────────

interface StatsGridProps {
  stats: StatCardProps[]
  hasData: boolean
}

function StatsGrid({ stats, hasData }: StatsGridProps) {
  const gridRef = useRef<HTMLDivElement>(null)
  const animatedRef = useRef(false)

  useEffect(() => {
    if (animatedRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      // Just make visible without animating
      const cards = gridRef.current?.querySelectorAll<HTMLElement>('[data-stat-card]')
      cards?.forEach((c) => {
        c.style.opacity = '1'
        c.style.transform = 'none'
      })
      return
    }

    import('animejs/lib/anime.es.js').then((mod) => {
      const anime = mod.default ?? mod
      const cards = gridRef.current?.querySelectorAll<HTMLElement>('[data-stat-card]')
      if (!cards?.length) return
      animatedRef.current = true

      anime({
        targets: cards,
        opacity: [0, 1],
        translateY: [20, 0],
        delay: anime.stagger(80, { start: 180 }),
        duration: 560,
        easing: 'easeOutExpo',
      })
    })
  }, [])

  return (
    <div
      ref={gridRef}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {stats.map((s, i) => (
        <StatCard key={s.label} {...s} hasData={hasData} index={i} />
      ))}
    </div>
  )
}

// ── Panel section (slide-in from sides) ───────────────────────────────────────

function PanelSection({ children }: { children: React.ReactNode }) {
  const sectionRef = useRef<HTMLDivElement>(null)
  const animatedRef = useRef(false)

  useEffect(() => {
    if (animatedRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    // IntersectionObserver — animate when visible
    const el = sectionRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !animatedRef.current) {
          animatedRef.current = true
          observer.disconnect()

          import('animejs/lib/anime.es.js').then((mod) => {
            const anime = mod.default ?? mod
            const panels = el.querySelectorAll<HTMLElement>('[data-panel]')
            if (!panels.length) return

            panels.forEach((p, i) => {
              anime({
                targets: p,
                opacity: [0, 1],
                translateX: [i % 2 === 0 ? -28 : 28, 0],
                duration: 640,
                delay: i * 80,
                easing: 'easeOutExpo',
              })
            })
          })
        }
      },
      { threshold: 0.05 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={sectionRef} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {children}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function DashboardHomeClient() {
  const companyId = useStore((s) => s.activeCompanyId)
  const { data } = useSummary(companyId)

  useEffect(() => {
    if (data?.pendingLeave?.length) {
      toast.info(`${data.pendingLeave.length} leave request${data.pendingLeave.length > 1 ? 's' : ''} pending review`, {
        duration: 4000,
      })
    }
  }, [data?.pendingLeave?.length])

  const hasData = data !== undefined

  const stats: StatCardProps[] = [
    {
      label: 'Active Employees',
      value: data?.activeEmployees ?? 0,
      rawValue: data?.activeEmployees ?? '—',
      icon: Users,
      gradient: 'linear-gradient(135deg, #80151B, #5A0C11)',
      glow: '0 4px 12px rgba(128,21,27,0.30)',
      hasData,
      index: 0,
    },
    {
      label: 'On Leave Today',
      value: data?.onLeaveToday ?? 0,
      rawValue: data?.onLeaveToday ?? '—',
      icon: Clock,
      gradient: 'linear-gradient(135deg, #EAB308, #CA9A07)',
      glow: '0 4px 12px rgba(234,179,8,0.3)',
      hasData,
      index: 1,
    },
    {
      label: 'Contract Expiries',
      value: data?.contractExpiries?.length ?? 0,
      rawValue: data?.contractExpiries?.length ?? '—',
      icon: AlertTriangle,
      gradient: 'linear-gradient(135deg, #EF4444, #DC2626)',
      glow: '0 4px 12px rgba(239,68,68,0.3)',
      hasData,
      index: 2,
    },
    {
      label: 'Pending Approvals',
      value: data?.pendingLeave?.length ?? 0,
      rawValue: data?.pendingLeave?.length ?? '—',
      icon: Calendar,
      gradient: 'linear-gradient(135deg, #C9A84C, #A8892A)',
      glow: '0 4px 12px rgba(201,168,76,0.30)',
      hasData,
      index: 3,
    },
  ]

  return (
    <div className="space-y-6">

      {/* ── Hero zone with particle canvas ── */}
      <div
        className="relative rounded-2xl overflow-hidden px-6 pt-8 pb-6 -mx-1"
        style={{
          background: 'linear-gradient(135deg, rgba(128,21,27,0.04) 0%, rgba(201,168,76,0.04) 50%, rgba(248,246,246,0) 100%)',
          minHeight: 120,
        }}
      >
        <ParticleCanvas />
        {/* Hero content sits above canvas */}
        <div className="relative z-10">
          <HeroHeader />
        </div>
      </div>

      {/* ── Stat cards ── */}
      <StatsGrid stats={stats} hasData={hasData} />

      {/* ── Panels ── */}
      <PanelSection>
        {/* Contract expiries */}
        <div
          data-panel
          className="card"
          style={{ opacity: 0, willChange: 'transform, opacity' }}
        >
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
        <div
          data-panel
          className="card"
          style={{ opacity: 0, willChange: 'transform, opacity' }}
        >
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
