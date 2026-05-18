'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff, Loader2, Mail, ArrowLeft, KeyRound } from 'lucide-react'
import { loginSchema, type LoginInput } from '@hr/shared'
import { createBrowserClient } from '@hr/shared'

type Mode = 'password' | 'otp-email' | 'otp-code'

function FloatingInput({
  id,
  label,
  type = 'text',
  autoComplete,
  error,
  registration,
}: {
  id: string
  label: string
  type?: string
  autoComplete?: string
  error?: string
  registration: ReturnType<ReturnType<typeof useForm>['register']>
}) {
  const [focused, setFocused] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [hasValue, setHasValue] = useState(false)
  const isPassword = type === 'password'
  const floated = focused || hasValue

  return (
    <div>
      <div
        className="relative rounded-xl border-2 transition-colors duration-200"
        style={{
          borderColor: error ? '#EF4444' : focused ? '#F47920' : '#E2E8F0',
          background: '#FFFFFF',
        }}
      >
        <label
          htmlFor={id}
          className="absolute left-4 pointer-events-none transition-all duration-150"
          style={{
            top: floated ? '6px' : '50%',
            transform: floated ? 'none' : 'translateY(-50%)',
            fontSize: floated ? '10px' : '14px',
            color: error ? '#EF4444' : focused ? '#F47920' : '#6B7280',
            fontWeight: floated ? 600 : 400,
          }}
        >
          {label}
        </label>
        <input
          id={id}
          type={isPassword && showPw ? 'text' : type}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          className="w-full bg-transparent px-4 pb-3 pt-6 text-sm text-text-body focus:outline-none rounded-xl"
          {...registration}
          onBlur={(e) => {
            registration.onBlur(e)
            setFocused(false)
            setHasValue(e.target.value.length > 0)
          }}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPw(!showPw)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-body transition-colors"
          >
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-danger mt-1 ml-1">{error}</p>}
    </div>
  )
}

// ── Password login ─────────────────────────────────────────────────────────────

function PasswordForm({ onSwitch }: { onSwitch: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const shouldReduce = useReducedMotion()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setIsLoading(true)
    setError(null)
    try {
      const supabase = createBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })
      if (authError) { setError(authError.message); return }
      router.push('/')
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <FloatingInput id="email" label="Email address" type="email" autoComplete="email"
        error={errors.email?.message} registration={register('email')} />
      <FloatingInput id="password" label="Password" type="password" autoComplete="current-password"
        error={errors.password?.message} registration={register('password')} />

      {error && (
        <div className="rounded-xl bg-danger/8 border border-danger/20 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <motion.button type="submit" disabled={isLoading}
        whileTap={shouldReduce ? {} : { scale: 0.97 }}
        className="w-full h-12 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-70 focus:outline-none"
        style={{ background: 'linear-gradient(135deg, #F47920 0%, #E8650A 100%)', boxShadow: '0 4px 16px rgba(244,121,32,0.30)' }}
      >
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
      </motion.button>

      <button type="button" onClick={onSwitch}
        className="w-full text-sm text-text-muted hover:text-accent transition-colors flex items-center justify-center gap-1.5 pt-1">
        <KeyRound className="w-3.5 h-3.5" />
        Sign in with email OTP instead
      </button>
    </form>
  )
}

// ── OTP: step 1 — enter email ──────────────────────────────────────────────────

function OtpEmailStep({
  onSent,
  onBack,
}: {
  onSent: (email: string) => void
  onBack: () => void
}) {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shouldReduce = useReducedMotion()

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setIsLoading(true)
    setError(null)
    try {
      const supabase = createBrowserClient()
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { shouldCreateUser: false },
      })
      if (authError) { setError(authError.message); return }
      onSent(email.trim())
    } catch {
      setError('Failed to send code. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSend} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-text-body mb-1.5">Work email address</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          required
          className="w-full rounded-xl border-2 border-border px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-danger/8 border border-danger/20 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <motion.button type="submit" disabled={isLoading || !email}
        whileTap={shouldReduce ? {} : { scale: 0.97 }}
        className="w-full h-12 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-70 focus:outline-none"
        style={{ background: 'linear-gradient(135deg, #F47920 0%, #E8650A 100%)', boxShadow: '0 4px 16px rgba(244,121,32,0.30)' }}
      >
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending code...</> : <><Mail className="w-4 h-4" /> Send OTP Code</>}
      </motion.button>

      <button type="button" onClick={onBack}
        className="w-full text-sm text-text-muted hover:text-text-body transition-colors flex items-center justify-center gap-1.5 pt-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to password login
      </button>
    </form>
  )
}

// ── OTP: step 2 — enter code ───────────────────────────────────────────────────

function OtpCodeStep({ email, onBack }: { email: string; onBack: () => void }) {
  const [code, setCode] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const shouldReduce = useReducedMotion()

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (code.length < 6) return
    setIsLoading(true)
    setError(null)
    try {
      const supabase = createBrowserClient()
      const { error: authError } = await supabase.auth.verifyOtp({
        email,
        token: code.trim(),
        type: 'email',
      })
      if (authError) { setError('Invalid or expired code. Please try again.'); return }
      router.push('/')
      router.refresh()
    } catch {
      setError('Verification failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleVerify} className="space-y-4">
      <div className="rounded-xl bg-surface-alt border border-border px-4 py-3 flex items-center gap-2">
        <Mail className="w-4 h-4 text-accent flex-shrink-0" />
        <p className="text-sm text-text-body">
          A 6-digit code was sent to <strong>{email}</strong>
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-text-body mb-1.5">Enter 6-digit code</label>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="000000"
          autoComplete="one-time-code"
          required
          className="w-full rounded-xl border-2 border-border px-4 py-3 text-2xl font-mono text-center tracking-[0.5em] focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {error && (
        <div className="rounded-xl bg-danger/8 border border-danger/20 px-4 py-3">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <motion.button type="submit" disabled={isLoading || code.length < 6}
        whileTap={shouldReduce ? {} : { scale: 0.97 }}
        className="w-full h-12 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 disabled:opacity-70 focus:outline-none"
        style={{ background: 'linear-gradient(135deg, #F47920 0%, #E8650A 100%)', boxShadow: '0 4px 16px rgba(244,121,32,0.30)' }}
      >
        {isLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</> : 'Verify & Sign In'}
      </motion.button>

      <button type="button" onClick={onBack}
        className="w-full text-sm text-text-muted hover:text-text-body transition-colors flex items-center justify-center gap-1.5 pt-1">
        <ArrowLeft className="w-3.5 h-3.5" />
        Use a different email
      </button>
    </form>
  )
}

// ── Root export ────────────────────────────────────────────────────────────────

export function LoginForm() {
  const [mode, setMode] = useState<Mode>('password')
  const [otpEmail, setOtpEmail] = useState('')
  const shouldReduce = useReducedMotion()

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir * 24 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir * -24 }),
  }

  const dir = mode === 'password' ? -1 : 1

  return (
    <div className="overflow-hidden">
      <AnimatePresence mode="wait" custom={dir} initial={false}>
        <motion.div
          key={mode}
          custom={dir}
          variants={shouldReduce ? {} : slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.2, ease: 'easeInOut' }}
        >
          {mode === 'password' && (
            <PasswordForm onSwitch={() => setMode('otp-email')} />
          )}
          {mode === 'otp-email' && (
            <OtpEmailStep
              onSent={(email) => { setOtpEmail(email); setMode('otp-code') }}
              onBack={() => setMode('password')}
            />
          )}
          {mode === 'otp-code' && (
            <OtpCodeStep email={otpEmail} onBack={() => setMode('otp-email')} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
