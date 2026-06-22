'use client'
import { useEffect } from 'react'

export function TrackerTokenSaver({ token }: { token: string }) {
  useEffect(() => {
    try {
      // Update legacy single-token key
      localStorage.setItem('sl_tracker_token', token)
      // Update multi-application array
      const existing = JSON.parse(localStorage.getItem('sl_applications') ?? '[]') as string[]
      if (!existing.includes(token)) {
        existing.unshift(token)
        localStorage.setItem('sl_applications', JSON.stringify(existing.slice(0, 20)))
        window.dispatchEvent(new Event('sl-tracker-saved'))
      }
      // Sync to server cookie
      fetch('/api/track/cookie', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      }).catch(() => {})
    } catch { /* storage unavailable */ }
  }, [token])
  return null
}
