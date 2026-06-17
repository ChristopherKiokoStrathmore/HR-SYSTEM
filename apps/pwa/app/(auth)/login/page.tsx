'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { t, type Language } from '@hr/i18n'
import { useStore } from '@/lib/store'

export default function PwaLoginPage() {
  const setLanguage = useStore((s) => s.setLanguage)

  const [lang, setLang] = useState<Language>('en')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Sign in failed'); return }
      window.location.href = '/home'
    } catch {
      setError('Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
        <div className="bg-white rounded-3xl p-6">
          <h2 className="font-semibold text-text-primary text-lg mb-4">{t(lang, 'login.title')}</h2>

          {error && <p className="text-sm text-danger bg-danger/10 rounded-xl px-3 py-2 mb-3">{error}</p>}

          <form onSubmit={handlePasswordSubmit} className="space-y-3">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-text-body block mb-1.5">
                {t(lang, 'login.email')}
              </label>
              <input id="email" type="email" className="input" autoComplete="email"
                placeholder={t(lang, 'login.placeholder_email')}
                value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} required />
            </div>

            <div>
              <label htmlFor="password" className="text-sm font-medium text-text-body block mb-1.5">
                {t(lang, 'login.password')}
              </label>
              <input id="password" type="password" className="input" autoComplete="current-password"
                placeholder={t(lang, 'login.placeholder_password')}
                value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} required />
            </div>

            <motion.button type="submit" className="btn-primary w-full mt-1" disabled={loading}
              whileTap={{ scale: 0.97 }}
            >
              {loading ? t(lang, 'login.loading') : t(lang, 'login.submit')}
            </motion.button>
          </form>
        </div>
      </div>
    </div>
  )
}
