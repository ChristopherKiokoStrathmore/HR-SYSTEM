'use client'

import { useState, useEffect, useRef } from 'react'
import { MapPin, CheckCircle } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import anime from 'animejs'
import { toast } from 'sonner'
import ReactConfetti from 'react-confetti'
import { useAttendance, useCheckInOut, type AttendanceRecord } from '@/lib/hooks/use-attendance-pwa'
import { useStore } from '@/lib/store'
import { t } from '@hr/i18n'

function formatTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })
}

function calcHours(checkIn: string | null, checkOut: string | null) {
  if (!checkIn || !checkOut) return '—'
  const diff = (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60)
  return `${diff.toFixed(1)}h`
}

function DayChip({ record }: { record: AttendanceRecord }) {
  const day = new Date(record.shift_date).toLocaleDateString('en-KE', { weekday: 'short' })
  const isPresent = record.status === 'present'
  return (
    <div
      className="flex-shrink-0 flex flex-col items-center rounded-2xl px-3 py-2.5"
      style={{
        background: isPresent ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
        color: isPresent ? '#22C55E' : '#EF4444',
      }}
    >
      <span className="text-xs font-semibold">{day}</span>
      <span className="text-[10px] opacity-70 mt-0.5">{formatTime(record.check_in_time)}</span>
    </div>
  )
}

const statVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
}
const statItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 22 } },
}

export default function AttendancePage() {
  const lang = useStore((s) => s.language)
  const shouldReduce = useReducedMotion()
  const { data, isLoading } = useAttendance()
  const checkInOut = useCheckInOut()
  const [currentTime, setCurrentTime] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const pulseAnim = useRef<ReturnType<typeof anime> | null>(null)

  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight })
  }, [])

  useEffect(() => {
    function tick() {
      setCurrentTime(new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const todayRecord = data?.data?.find((r) => r.shift_date === data.today)
  const history = data?.data?.filter((r) => r.shift_date !== data.today) ?? []
  const isCheckedIn = !!todayRecord?.check_in_time
  const isCheckedOut = !!todayRecord?.check_out_time

  useEffect(() => {
    if (shouldReduce) return
    if (isCheckedIn && !isCheckedOut) {
      pulseAnim.current = anime({
        targets: '.pulse-ring',
        scale: [1, 2.4],
        opacity: [0.5, 0],
        duration: 2000,
        delay: anime.stagger(600),
        loop: true,
        easing: 'easeOutCubic',
      })
    } else {
      pulseAnim.current?.pause()
      pulseAnim.current = null
      anime({ targets: '.pulse-ring', scale: 1, opacity: 0, duration: 0 })
    }
    return () => { pulseAnim.current?.pause() }
  }, [isCheckedIn, isCheckedOut, shouldReduce])

  async function handleCheckInOut() {
    try {
      let coords = {}
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        )
        coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
      } catch (gpsErr: any) {
        if (gpsErr?.code !== 1) {
          toast.error(t(lang, 'attendance.location_error'))
          return
        }
        // code 1 = denied, proceed without GPS
      }
      const result = await checkInOut.mutateAsync(coords)
      if (result?.action === 'checked_in') {
        toast.success(t(lang, 'attendance.checked_in_success'), { description: 'Have a great day!' })
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3500)
      } else {
        toast.success(`${t(lang, 'attendance.checked_out_success')} · ${result?.workHours?.toFixed(1)}h`, { description: 'Great work today!' })
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.toLowerCase().includes('already completed')) {
        toast.info('Your attendance for today is already recorded.', { description: 'Refreshing…' })
      } else {
        toast.error(msg)
      }
    }
  }

  const buttonLabel = isCheckedOut
    ? t(lang, 'status.completed')
    : isCheckedIn
      ? t(lang, 'actions.check_out')
      : t(lang, 'actions.check_in')

  const buttonStyle = isCheckedOut
    ? { background: '#9CA3AF', boxShadow: 'none' }
    : isCheckedIn
      ? { background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', boxShadow: '0 8px 32px rgba(239,68,68,0.4), inset 0 1px 1px rgba(255,255,255,0.2)' }
      : { background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', boxShadow: '0 8px 32px rgba(34,197,94,0.4), inset 0 1px 1px rgba(255,255,255,0.2)' }

  return (
    <div className="px-4 pt-6 space-y-6 pb-4">
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width}
          height={windowSize.height}
          recycle={false}
          numberOfPieces={180}
          colors={['#F47920', '#1A2E5A', '#22C55E', '#EAB308', '#FFFFFF']}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 100, pointerEvents: 'none' }}
        />
      )}

      <motion.h1
        className="text-2xl font-black text-text-primary tracking-tight"
        initial={shouldReduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {t(lang, 'nav.attendance')}
      </motion.h1>

      {/* Check-in orb */}
      <div className="flex flex-col items-center py-8">
        <div className="checkin-pulse">
          {/* Anime.js pulse rings */}
          <div className="pulse-ring absolute" style={{ borderColor: isCheckedIn && !isCheckedOut ? 'rgba(239,68,68,0.45)' : 'rgba(34,197,94,0.45)' }} />
          <div className="pulse-ring absolute" style={{ borderColor: isCheckedIn && !isCheckedOut ? 'rgba(239,68,68,0.45)' : 'rgba(34,197,94,0.45)' }} />
          <div className="pulse-ring absolute" style={{ borderColor: isCheckedIn && !isCheckedOut ? 'rgba(239,68,68,0.45)' : 'rgba(34,197,94,0.45)' }} />

          <motion.button
            onClick={handleCheckInOut}
            disabled={isCheckedOut || checkInOut.isPending || isLoading}
            initial={shouldReduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            whileTap={isCheckedOut ? {} : { scale: 0.93 }}
            className="relative w-44 h-44 rounded-full font-bold text-lg text-white flex flex-col items-center justify-center gap-1 focus:outline-none"
            style={{ ...buttonStyle, cursor: isCheckedOut ? 'not-allowed' : 'pointer' }}
          >
            {checkInOut.isPending ? (
              <span className="text-sm font-medium opacity-80">...</span>
            ) : isCheckedOut ? (
              <>
                <CheckCircle className="w-8 h-8 mb-1" />
                <span className="text-base">{t(lang, 'status.completed')}</span>
              </>
            ) : (
              <span className="text-xl font-bold">{buttonLabel}</span>
            )}
          </motion.button>
        </div>

        <p className="text-text-muted text-sm mt-6 tabular-nums font-mono">{currentTime}</p>
      </div>

      {/* Today stats */}
      <motion.div variants={statVariants} initial="hidden" animate="show" className="grid grid-cols-3 gap-3">
        {[
          { value: formatTime(todayRecord?.check_in_time ?? null), label: t(lang, 'attendance.check_in_time') },
          { value: calcHours(todayRecord?.check_in_time ?? null, todayRecord?.check_out_time ?? null), label: t(lang, 'attendance.hours_worked') },
          { value: todayRecord?.distance_covered_km != null ? `${todayRecord.distance_covered_km.toFixed(1)}km` : '—', label: t(lang, 'attendance.distance_covered') },
        ].map(({ value, label }) => (
          <motion.div key={label} variants={statItem} className="rounded-2xl bg-white text-center py-4 px-2" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="text-base font-black text-text-primary">{value}</p>
            <p className="text-[10px] text-text-muted mt-0.5 leading-tight">{label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* GPS indicator */}
      {todayRecord?.check_in_lat && (
        <div className="rounded-2xl bg-white flex items-center gap-2 p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <MapPin className="w-4 h-4 text-success flex-shrink-0" />
          <p className="text-sm text-text-body">
            {t(lang, 'attendance.gps_recorded')}: {todayRecord.check_in_lat.toFixed(4)}, {todayRecord.check_in_lng?.toFixed(4)}
          </p>
        </div>
      )}

      {/* Weekly history */}
      {history.length > 0 && (
        <div>
          <h2 className="font-semibold text-text-primary mb-3">{t(lang, 'attendance.weekly_summary')}</h2>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scroll-hidden">
            {history.map((r) => <DayChip key={r.id} record={r} />)}
          </div>
        </div>
      )}
    </div>
  )
}
