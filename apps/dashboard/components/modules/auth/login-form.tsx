'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, useReducedMotion } from 'framer-motion'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { loginSchema, type LoginInput } from '@hr/shared'

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

export function LoginForm() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const shouldReduce = useReducedMotion()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginInput) {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email, password: data.password }),
      })
      console.log('Login payload:', res)

      const result = await res.json()
      console.log('Login response:', result)
      if (!res.ok) { setError(result.error || 'Login failed'); return }
      window.location.href = '/'
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
    </form>
  )
}
