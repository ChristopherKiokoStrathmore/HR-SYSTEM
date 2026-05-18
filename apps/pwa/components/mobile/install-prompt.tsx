'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Share, PlusSquare, Download } from 'lucide-react'
import { useStore } from '@/lib/store'

type Platform = 'ios' | 'android' | 'other' | null

function detectPlatform(): Platform {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
}

const DISMISS_KEY = 'sl-install-dismissed'

export function InstallPrompt() {
  const lang = useStore((s) => s.language)
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<Platform>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)

  useEffect(() => {
    // Never show if already installed or user dismissed in last 7 days
    if (isStandalone()) return
    const dismissed = localStorage.getItem(DISMISS_KEY)
    if (dismissed && Date.now() - parseInt(dismissed) < 7 * 24 * 60 * 60 * 1000) return

    const p = detectPlatform()
    setPlatform(p)

    // Android: capture browser install event
    function onBeforeInstall(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e)
      setShow(true)
    }

    window.addEventListener('beforeinstallprompt', onBeforeInstall)

    // iOS: show manual instructions after a short delay
    if (p === 'ios') {
      const timer = setTimeout(() => setShow(true), 2500)
      return () => { clearTimeout(timer); window.removeEventListener('beforeinstallprompt', onBeforeInstall) }
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall)
  }, [])

  function dismiss() {
    setShow(false)
    localStorage.setItem(DISMISS_KEY, Date.now().toString())
  }

  async function handleInstall() {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      if (outcome === 'accepted') setShow(false)
      setDeferredPrompt(null)
    }
    dismiss()
  }

  const isEn = lang === 'en'

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          className="fixed bottom-0 left-0 right-0 z-[200]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div
            className="mx-3 mb-3 rounded-3xl overflow-hidden"
            style={{ background: '#1A2E5A', boxShadow: '0 -4px 32px rgba(0,0,0,0.25)' }}
          >
            {/* Header row */}
            <div className="flex items-center gap-3 px-5 pt-5 pb-3">
              <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center flex-shrink-0">
                <span className="text-white font-black text-lg">SL</span>
              </div>
              <div className="flex-1">
                <p className="text-white font-bold text-base leading-tight">
                  {isEn ? 'Add to Home Screen' : 'Ongeza kwenye Skrini ya Nyumbani'}
                </p>
                <p className="text-white/60 text-xs mt-0.5">
                  {isEn ? 'Get the full app experience' : 'Pata uzoefu kamili wa programu'}
                </p>
              </div>
              <button onClick={dismiss} className="p-1.5 rounded-xl bg-white/10 text-white/60 hover:bg-white/20 transition-colors flex-shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform-specific instructions */}
            {platform === 'ios' ? (
              <div className="px-5 pb-5 space-y-2">
                <p className="text-white/70 text-xs mb-3">
                  {isEn ? 'Follow these steps:' : 'Fuata hatua hizi:'}
                </p>
                {[
                  { icon: Share, text: isEn ? 'Tap the Share button in Safari' : 'Bonyeza kitufe cha Kushiriki katika Safari' },
                  { icon: PlusSquare, text: isEn ? 'Select "Add to Home Screen"' : 'Chagua "Ongeza kwenye Skrini ya Nyumbani"' },
                ].map(({ icon: Icon, text }, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                    <p className="text-white/80 text-sm">{text}</p>
                  </div>
                ))}
                <button onClick={dismiss} className="w-full mt-3 py-2.5 rounded-2xl bg-white/10 text-white/70 text-sm font-medium">
                  {isEn ? 'Maybe later' : 'Labda baadaye'}
                </button>
              </div>
            ) : (
              <div className="px-5 pb-5 flex gap-3">
                <button
                  onClick={dismiss}
                  className="flex-1 py-3 rounded-2xl bg-white/10 text-white/70 text-sm font-semibold"
                >
                  {isEn ? 'Not now' : 'Si sasa'}
                </button>
                <button
                  onClick={handleInstall}
                  className="flex-1 py-3 rounded-2xl text-white font-semibold text-sm flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #F47920, #E8650A)' }}
                >
                  <Download className="w-4 h-4" />
                  {isEn ? 'Install App' : 'Sakinisha Programu'}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
