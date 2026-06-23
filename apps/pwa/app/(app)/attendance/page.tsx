'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { MapPin, CheckCircle, Camera, RefreshCw, X, Share2, AlertTriangle } from 'lucide-react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import anime from 'animejs'
import { toast } from 'sonner'
import ReactConfetti from 'react-confetti'
import {
  useAttendance, useCheckInOut, useSubmitViolationReason,
  type AttendanceRecord,
} from '@/lib/hooks/use-attendance-pwa'
import { useMe } from '@/lib/hooks/use-me'
import { useStore } from '@/lib/store'
import { t } from '@hr/i18n'
import { extractDescriptor, compareFaces, loadModels } from '@/lib/face'

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

// ─── Selfie capture modal ───────────────────────────────────────────────────

interface SelfieModalProps {
  onCapture: (b64: string, faceVerified: boolean) => void
  onClose: () => void
  action: 'check_in' | 'check_out'
  storedDescriptor: number[] | null
}

function SelfieModal({ onCapture, onClose, action, storedDescriptor }: SelfieModalProps) {
  const videoRef  = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [camError, setCamError] = useState('')
  const [ready, setReady] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [faceError, setFaceError] = useState('')

  const startCamera = useCallback(async () => {
    setCamError('')
    setFaceError('')
    setPreview(null)
    setReady(false)
    // Preload models while camera warms up
    loadModels().catch(() => null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => setReady(true)
      }
    } catch {
      setCamError('Camera access denied. Please allow camera permission and try again.')
    }
  }, [])

  useEffect(() => {
    startCamera()
    return () => streamRef.current?.getTracks().forEach((t) => t.stop())
  }, [startCamera])

  function capture() {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const size = 480
    canvas.width  = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.translate(size, 0)
    ctx.scale(-1, 1)
    const vw = video.videoWidth
    const vh = video.videoHeight
    const side = Math.min(vw, vh)
    const ox = (vw - side) / 2
    const oy = (vh - side) / 2
    ctx.drawImage(video, ox, oy, side, side, 0, 0, size, size)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    setPreview(dataUrl)
    setFaceError('')
    streamRef.current?.getTracks().forEach((t) => t.stop())
  }

  function retake() { setPreview(null); setFaceError(''); startCamera() }

  async function confirm() {
    if (!preview) return
    setVerifying(true)
    setFaceError('')
    const b64 = preview.replace(/^data:image\/\w+;base64,/, '')

    // No stored descriptor yet — allow check-in without verification
    if (!storedDescriptor) {
      setVerifying(false)
      onCapture(b64, false)
      return
    }

    try {
      const liveDescriptor = await extractDescriptor(preview)
      if (!liveDescriptor) {
        setFaceError('No face detected in photo. Try again in better lighting.')
        setVerifying(false)
        return
      }
      const { verified } = compareFaces(storedDescriptor, liveDescriptor)
      if (!verified) {
        setFaceError('Face not recognised. Please try again in good lighting, facing the camera directly.')
        setVerifying(false)
        return
      }
      onCapture(b64, true)
    } catch {
      // On model-load failure, proceed without verification
      onCapture(b64, false)
    }
    setVerifying(false)
  }

  const label = action === 'check_in' ? 'Check In' : 'Check Out'

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className="relative w-full bg-white rounded-t-3xl overflow-hidden z-10"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 mb-1" />
        <div className="px-5 pb-8 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-text-primary text-base">{label} — Face Verification</p>
              <p className="text-xs text-text-muted mt-0.5">
                {storedDescriptor ? 'Look directly at the camera' : 'No face ID enrolled — upload a profile photo to enable face check-in'}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-surface-alt text-text-muted">
              <X className="w-5 h-5" />
            </button>
          </div>

          {!storedDescriptor && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800 font-medium">
              Upload a clear profile photo first to enable face recognition. You can still check in now.
            </div>
          )}

          {camError ? (
            <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 text-center">
              {camError}
            </div>
          ) : preview ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-64 h-64 rounded-full overflow-hidden ring-4 ring-[#C9A84C] shadow-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Captured selfie" className="w-full h-full object-cover" />
              </div>
              {faceError && (
                <p className="text-sm text-red-600 font-medium text-center px-2">{faceError}</p>
              )}
              <p className="text-sm font-medium text-text-body">Looks good?</p>
              <div className="flex gap-3 w-full">
                <button
                  onClick={retake}
                  disabled={verifying}
                  className="flex-1 h-12 rounded-2xl border border-border text-text-body font-semibold flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw className="w-4 h-4" /> Retake
                </button>
                <button
                  onClick={confirm}
                  disabled={verifying}
                  className="flex-1 h-12 rounded-2xl text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #80151B, #5A0C11)', boxShadow: '0 4px 16px rgba(128,21,27,0.35)' }}
                >
                  {verifying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {verifying ? 'Verifying…' : label}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-64 h-64 rounded-full overflow-hidden ring-4 ring-[#C9A84C]/60 shadow-xl bg-black">
                <video
                  ref={videoRef} autoPlay playsInline muted
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!ready && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="w-10 h-10 text-white/60" />
                  </div>
                )}
                <div className="absolute inset-4 rounded-full border-2 border-dashed border-white/40 pointer-events-none" />
              </div>
              <canvas ref={canvasRef} className="hidden" />
              <p className="text-xs text-text-muted text-center">Position your face within the circle</p>
              <button
                onClick={capture} disabled={!ready}
                className="w-16 h-16 rounded-full text-white flex items-center justify-center shadow-lg disabled:opacity-40"
                style={{ background: 'linear-gradient(135deg, #80151B, #5A0C11)', boxShadow: '0 4px 20px rgba(128,21,27,0.40)' }}
              >
                <Camera className="w-7 h-7" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Geofence reason modal ────────────────────────────────────────────────────

function ReasonModal({
  violationId,
  onSubmit,
  onDismiss,
}: {
  violationId: string
  onSubmit: (id: string, reason: string) => void
  onDismiss: () => void
}) {
  const [reason, setReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit() {
    if (!reason.trim()) return
    setSubmitting(true)
    onSubmit(violationId, reason.trim())
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-end">
      <motion.div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onDismiss}
      />
      <motion.div
        className="relative w-full bg-white rounded-t-3xl overflow-hidden z-10"
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 320, damping: 32 }}
      >
        <div className="w-10 h-1 rounded-full bg-border mx-auto mt-3 mb-1" />
        <div className="px-5 pb-8 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-text-primary">Out of work zone</p>
              <p className="text-xs text-text-muted mt-0.5">
                Your check-in was recorded but you appear to be outside your assigned work area.
                Please provide a reason so your manager can review.
              </p>
            </div>
          </div>

          <textarea
            className="w-full rounded-2xl border border-border px-4 py-3 text-sm text-text-body placeholder:text-text-muted resize-none focus:outline-none focus:border-orange-400 transition-colors"
            rows={4}
            placeholder="e.g. Working from client site today, attending off-site training…"
            value={reason}
            onChange={e => setReason(e.target.value)}
            autoFocus
          />

          <div className="flex gap-3">
            <button
              onClick={onDismiss}
              className="flex-1 h-12 rounded-2xl border border-border text-text-body font-semibold text-sm"
            >
              Skip for now
            </button>
            <button
              onClick={handleSubmit}
              disabled={!reason.trim() || submitting}
              className="flex-1 h-12 rounded-2xl text-white font-bold text-sm disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #80151B, #5A0C11)' }}
            >
              Submit reason
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main page ───────────────────────────────────────────────────────────────

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
  const { data: me, isLoading: meLoading } = useMe()
  const { data, isLoading } = useAttendance()
  const checkInOut = useCheckInOut()
  const submitReason = useSubmitViolationReason()
  const [currentTime, setCurrentTime] = useState('')
  const [showConfetti, setShowConfetti] = useState(false)
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 })
  const [selfieOpen, setSelfieOpen] = useState(false)
  const [faceRejected, setFaceRejected] = useState(false)
  const [pendingViolation, setPendingViolation] = useState<string | null>(null)
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
  const isCheckedIn  = !!todayRecord?.check_in_time
  const isCheckedOut = !!todayRecord?.check_out_time
  const hasGps = todayRecord?.check_in_lat != null && todayRecord?.check_in_lng != null

  useEffect(() => {
    if (shouldReduce) return
    if (isCheckedIn && !isCheckedOut) {
      pulseAnim.current = anime({
        targets: '.pulse-ring',
        scale: [1, 2.4], opacity: [0.5, 0],
        duration: 2000, delay: anime.stagger(600), loop: true, easing: 'easeOutCubic',
      })
    } else {
      pulseAnim.current?.pause()
      pulseAnim.current = null
      anime({ targets: '.pulse-ring', scale: 1, opacity: 0, duration: 0 })
    }
    return () => { pulseAnim.current?.pause() }
  }, [isCheckedIn, isCheckedOut, shouldReduce])

  async function getGps(): Promise<{ lat?: number; lng?: number }> {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      )
      return { lat: pos.coords.latitude, lng: pos.coords.longitude }
    } catch (err: unknown) {
      if ((err as GeolocationPositionError)?.code !== 1) {
        toast.error(t(lang, 'attendance.location_error'))
        throw err
      }
      return {}
    }
  }

  async function submitCheckInOut(selfieB64?: string, faceVerified?: boolean) {
    setFaceRejected(false)
    try {
      const coords = await getGps()
      const result = await checkInOut.mutateAsync({
        ...coords,
        ...(selfieB64 ? { selfie_b64: selfieB64 } : {}),
        ...(faceVerified !== undefined ? { face_verified: faceVerified } : {}),
      })
      if (result?.action === 'checked_in') {
        toast.success(t(lang, 'attendance.checked_in_success'), { description: 'Have a great day!' })
        setShowConfetti(true)
        setTimeout(() => setShowConfetti(false), 3500)
        // Prompt for reason if out of zone
        if (result.reason_required && result.violation_id) {
          setPendingViolation(result.violation_id)
        }
      } else {
        toast.success(
          `${t(lang, 'attendance.checked_out_success')} · ${result?.workHours?.toFixed(1)}h`,
          { description: 'Great work today!' }
        )
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      if (msg.toLowerCase().includes('already completed')) {
        toast.info('Your attendance for today is already recorded.', { description: 'Refreshing…' })
      } else if (msg.toLowerCase().includes('face') || msg.toLowerCase().includes('recogni')) {
        setFaceRejected(true)
      } else {
        toast.error(msg)
      }
    }
  }

  function handleOrbTap() {
    if (isCheckedOut || checkInOut.isPending || isLoading) return
    setFaceRejected(false)
    setSelfieOpen(true)
  }

  function handleSelfieCapture(b64: string, faceVerified: boolean) {
    setSelfieOpen(false)
    submitCheckInOut(b64, faceVerified)
  }

  async function handleViolationReason(violationId: string, reason: string) {
    try {
      await submitReason.mutateAsync({ violationId, reason })
      toast.success('Reason submitted', { description: 'Your manager will be notified.' })
    } catch {
      toast.error('Could not submit reason — please try again later')
    } finally {
      setPendingViolation(null)
    }
  }

  async function handleCaptureLocation() {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
      )
      await checkInOut.mutateAsync({
        action: 'capture_location',
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      })
      toast.success('Location captured', { description: 'The attendance map will update shortly.' })
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not capture GPS location')
    }
  }

  function shareAttendance() {
    const checkIn  = formatTime(todayRecord?.check_in_time ?? null)
    const checkOut = formatTime(todayRecord?.check_out_time ?? null)
    const hours    = calcHours(todayRecord?.check_in_time ?? null, todayRecord?.check_out_time ?? null)
    const text = [
      `📋 My attendance for ${data?.today ?? 'today'}`,
      `Check-in: ${checkIn}`,
      checkOut !== '—' ? `Check-out: ${checkOut}` : null,
      hours !== '—' ? `Hours worked: ${hours}` : null,
    ].filter(Boolean).join('\n')

    if (navigator.share) {
      navigator.share({ title: 'My Attendance', text }).catch(() => null)
    } else {
      navigator.clipboard.writeText(text).then(() => toast.success('Copied to clipboard'))
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

  const isBlueCollar = me?.employee?.worker_class === 'blue_collar'

  if (!meLoading && me && !isBlueCollar) {
    return (
      <div className="px-4 pt-6 space-y-6 pb-4">
        <motion.h1
          className="text-2xl font-black text-text-primary tracking-tight"
          initial={shouldReduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {t(lang, 'nav.attendance')}
        </motion.h1>
        <div className="rounded-2xl bg-white text-center py-12 px-6" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-text-muted opacity-60" />
          <p className="text-base font-semibold text-text-primary">Check-in isn't required for your role</p>
          <p className="text-sm text-text-muted mt-1">Attendance clock-in is for blue-collar staff only.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 pt-6 space-y-6 pb-4">
      {showConfetti && (
        <ReactConfetti
          width={windowSize.width} height={windowSize.height}
          recycle={false} numberOfPieces={180}
          colors={['#80151B', '#C9A84C', '#22C55E', '#EAB308', '#FFFFFF']}
          style={{ position: 'fixed', top: 0, left: 0, zIndex: 100, pointerEvents: 'none' }}
        />
      )}

      <AnimatePresence>
        {selfieOpen && (
          <SelfieModal
            action={isCheckedIn ? 'check_out' : 'check_in'}
            onCapture={handleSelfieCapture}
            onClose={() => setSelfieOpen(false)}
            storedDescriptor={me?.employee?.face_descriptor ?? null}
          />
        )}
        {pendingViolation && (
          <ReasonModal
            violationId={pendingViolation}
            onSubmit={handleViolationReason}
            onDismiss={() => setPendingViolation(null)}
          />
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between">
        <motion.h1
          className="text-2xl font-black text-text-primary tracking-tight"
          initial={shouldReduce ? false : { opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {t(lang, 'nav.attendance')}
        </motion.h1>
        {(isCheckedIn || isCheckedOut) && (
          <button
            onClick={shareAttendance}
            className="flex items-center gap-1.5 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors px-3 py-1.5 rounded-xl hover:bg-surface-alt"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
        )}
      </div>

      {/* Face-required badge */}
      <div className="flex items-center gap-2 rounded-2xl bg-orange-50 border border-orange-100 px-4 py-2.5">
        <Camera className="w-4 h-4 text-orange-500 flex-shrink-0" />
        <p className="text-xs text-orange-700 font-medium">Face verification required for each check-in</p>
      </div>

      {/* Face rejected — retry banner */}
      <AnimatePresence>
        {faceRejected && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-3"
          >
            <div className="flex items-start gap-2 min-w-0">
              <X className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-red-800">Face not recognised</p>
                <p className="text-xs text-red-700/80 mt-0.5">Please try again in good lighting, facing the camera directly.</p>
              </div>
            </div>
            <button
              onClick={() => { setFaceRejected(false); setSelfieOpen(true) }}
              className="flex-shrink-0 rounded-xl bg-red-600 px-3 py-1.5 text-xs font-bold text-white"
            >
              Try again
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Check-in orb */}
      <div className="flex flex-col items-center py-8">
        <div className="checkin-pulse">
          <div className="pulse-ring absolute" style={{ borderColor: isCheckedIn && !isCheckedOut ? 'rgba(239,68,68,0.45)' : 'rgba(34,197,94,0.45)' }} />
          <div className="pulse-ring absolute" style={{ borderColor: isCheckedIn && !isCheckedOut ? 'rgba(239,68,68,0.45)' : 'rgba(34,197,94,0.45)' }} />
          <div className="pulse-ring absolute" style={{ borderColor: isCheckedIn && !isCheckedOut ? 'rgba(239,68,68,0.45)' : 'rgba(34,197,94,0.45)' }} />

          <motion.button
            onClick={handleOrbTap}
            disabled={isCheckedOut || checkInOut.isPending || isLoading}
            initial={shouldReduce ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
            whileTap={isCheckedOut ? {} : { scale: 0.93 }}
            className="relative w-44 h-44 rounded-full font-bold text-lg text-white flex flex-col items-center justify-center gap-1 focus:outline-none"
            style={{ ...buttonStyle, cursor: isCheckedOut ? 'not-allowed' : 'pointer' }}
          >
            {checkInOut.isPending ? (
              <span className="text-sm font-medium opacity-80">Verifying…</span>
            ) : isCheckedOut ? (
              <>
                <CheckCircle className="w-8 h-8 mb-1" />
                <span className="text-base">{t(lang, 'status.completed')}</span>
              </>
            ) : (
              <>
                <Camera className="w-7 h-7 mb-1 opacity-80" />
                <span className="text-lg font-bold">{buttonLabel}</span>
              </>
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
      {hasGps ? (
        <div className="rounded-2xl bg-white flex items-center gap-2 p-4" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <MapPin className="w-4 h-4 text-success flex-shrink-0" />
          <p className="text-sm text-text-body">
            {t(lang, 'attendance.gps_recorded')}: {todayRecord?.check_in_lat?.toFixed(4)}, {todayRecord?.check_in_lng?.toFixed(4)}
          </p>
        </div>
      ) : isCheckedIn && !isCheckedOut ? (
        <div className="rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 p-4">
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-sm font-medium text-amber-900">No GPS captured for this check-in</p>
              <p className="text-xs text-amber-800/80">Tap to re-capture location so the dashboard map can show where this check-in happened.</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            onClick={handleCaptureLocation}
            disabled={checkInOut.isPending}
          >
            Capture location
          </button>
        </div>
      ) : null}

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
