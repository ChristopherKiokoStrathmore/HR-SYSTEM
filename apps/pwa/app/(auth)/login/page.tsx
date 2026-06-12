'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createBrowserClient } from '@hr/shared'
import { t, type Language } from '@hr/i18n'
import { useStore } from '@/lib/store'

type Mode = 'password' | 'otp-email' | 'otp-code'

export default function PwaLoginPage() {
  const router = useRouter()
  const setLanguage = useStore((s) => s.setLanguage)

  const [lang, setLang] = useState<Language>('en')
  const [mode, setMode] = useState<Mode>('password')
  const [otpEmail, setOtpEmail] = useState('')

  // Password fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  // OTP fields
  const [otpInputEmail, setOtpInputEmail] = useState('')
  const [code, setCode] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLang(useStore.getState().language)
  }, [])

  function handleLangChange(newLang: Language) {
    setLang(newLang)
    setLanguage(newLang)
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })
      if (authErr) throw authErr
      router.push('/home')
      router.refresh()
    } catch (err: any) {
      setError(err.message ?? 'Sign in failed')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { error: authErr } = await supabase.auth.signInWithOtp({
        email: otpInputEmail.trim(),
        options: { shouldCreateUser: false },
      })
      if (authErr) throw authErr
      setOtpEmail(otpInputEmail.trim())
      setMode('otp-code')
    } catch (err: any) {
      setError(err.message ?? 'Failed to send OTP')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const supabase = createBrowserClient()
      const { error: authErr } = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: code.trim(),
        type: 'email',
      })
      if (authErr) throw authErr
      router.push('/home')
      router.refresh()
    } catch {
      setError('Invalid or expired code. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function resetError() { setError('') }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-primary px-6">
      <div className="w-full max-w-sm">

        {/* Language selector */}
        <div className="flex justify-center gap-2 mb-6">
          {(['en', 'sw'] as Language[]).map((l) => (
            <button key={l} type="button" onClick={() => handleLangChange(l)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                lang === l ? 'bg-white text-primary' : 'bg-white/20 text-white/70 hover:bg-white/30'
              }`}
            >
              {l === 'en' ? '🇬🇧 English' : '🇰🇪 Kiswahili'}
            </button>
          ))}
        </div>

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex w-20 h-20 rounded-3xl bg-accent items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">SL</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Sheer Logic HR</h1>
          <p className="text-white/60 text-sm mt-1">
            {lang === 'en' ? 'Employee Portal' : 'Mfumo wa Wafanyikazi'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl p-6 overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>

            {/* Password mode */}
            {mode === 'password' && (
              <motion.div key="password"
                initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}
              >
                <h2 className="font-semibold text-text-primary text-lg mb-4">{t(lang, 'login.title')}</h2>

                {error && <p className="text-sm text-danger bg-danger/10 rounded-xl px-3 py-2 mb-3">{error}</p>}

                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  <div>
                    <label htmlFor="email" className="text-sm font-medium text-text-body block mb-1.5">
                      {t(lang, 'login.email')}
                    </label>
                    <input id="email" type="email" className="input" autoComplete="email"
                      placeholder={t(lang, 'login.placeholder_email')}
                      value={email} onChange={(e) => { setEmail(e.target.value); resetError() }} required />
                  </div>

                  <div>
                    <label htmlFor="password" className="text-sm font-medium text-text-body block mb-1.5">
                      {t(lang, 'login.password')}
                    </label>
                    <input id="password" type="password" className="input" autoComplete="current-password"
                      placeholder={t(lang, 'login.placeholder_password')}
                      value={password} onChange={(e) => { setPassword(e.target.value); resetError() }} required />
                  </div>

                  <button type="submit" className="btn-primary w-full mt-1" disabled={loading}>
                    {loading ? t(lang, 'login.loading') : t(lang, 'login.submit')}
                  </button>
                </form>

                <button type="button" onClick={() => { setMode('otp-email'); resetError() }}
                  className="w-full mt-4 text-sm text-text-muted hover:text-accent transition-colors text-center">
                  {lang === 'en' ? 'Sign in with email OTP instead' : 'Ingia kwa nambari ya OTP'}
                </button>
              </motion.div>
            )}

            {/* OTP step 1 — enter email */}
            {mode === 'otp-email' && (
              <motion.div key="otp-email"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}
              >
                <h2 className="font-semibold text-text-primary text-lg mb-1">
                  {lang === 'en' ? 'Sign in with OTP' : 'Ingia kwa OTP'}
                </h2>
                <p className="text-sm text-text-muted mb-4">
                  {lang === 'en' ? 'We\'ll send a 6-digit code to your email.' : 'Tutatuma nambari ya tarakimu 6 kwa barua pepe yako.'}
                </p>

                {error && <p className="text-sm text-danger bg-danger/10 rounded-xl px-3 py-2 mb-3">{error}</p>}

                <form onSubmit={handleSendOtp} className="space-y-3">
                  <input type="email" className="input" autoComplete="email"
                    placeholder={t(lang, 'login.placeholder_email')}
                    value={otpInputEmail} onChange={(e) => { setOtpInputEmail(e.target.value); resetError() }} required />

                  <button type="submit" className="btn-primary w-full" disabled={loading || !otpInputEmail}>
                    {loading ? (lang === 'en' ? 'Sending...' : 'Inatuma...') : (lang === 'en' ? 'Send OTP Code' : 'Tuma Nambari')}
                  </button>
                </form>

                <button type="button" onClick={() => { setMode('password'); resetError() }}
                  className="w-full mt-4 text-sm text-text-muted hover:text-accent transition-colors text-center">
                  ← {lang === 'en' ? 'Back to password login' : 'Rudi kwa nenosiri'}
                </button>
              </motion.div>
            )}

            {/* OTP step 2 — enter code */}
            {mode === 'otp-code' && (
              <motion.div key="otp-code"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}
              >
                <h2 className="font-semibold text-text-primary text-lg mb-1">
                  {lang === 'en' ? 'Enter your code' : 'Weka nambari yako'}
                </h2>
                <p className="text-sm text-text-muted mb-4">
                  {lang === 'en'
                    ? `Code sent to ${otpEmail}`
                    : `Nambari imetumwa kwa ${otpEmail}`}
                </p>

                {error && <p className="text-sm text-danger bg-danger/10 rounded-xl px-3 py-2 mb-3">{error}</p>}

                <form onSubmit={handleVerifyOtp} className="space-y-3">
                  <input
                    type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
                    autoComplete="one-time-code"
                    className="input text-center text-2xl font-mono tracking-[0.5em]"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, '').slice(0, 6)); resetError() }}
                    required
                  />

                  <button type="submit" className="btn-primary w-full" disabled={loading || code.length < 6}>
                    {loading ? (lang === 'en' ? 'Verifying...' : 'Inathibitisha...') : (lang === 'en' ? 'Verify & Sign In' : 'Thibitisha na Ingia')}
                  </button>
                </form>

                <button type="button" onClick={() => { setMode('otp-email'); setCode(''); resetError() }}
                  className="w-full mt-4 text-sm text-text-muted hover:text-accent transition-colors text-center">
                  ← {lang === 'en' ? 'Use a different email' : 'Tumia barua pepe nyingine'}
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
