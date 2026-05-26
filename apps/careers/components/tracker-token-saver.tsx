'use client'
import { useEffect } from 'react'

export function TrackerTokenSaver({ token }: { token: string }) {
  useEffect(() => {
    localStorage.setItem('sl_tracker_token', token)
    window.dispatchEvent(new Event('sl-tracker-saved'))
  }, [token])
  return null
}
