'use client'
import { useEffect } from 'react'

export function TrackerTokenSaver({ token }: { token: string }) {
  useEffect(() => {
    localStorage.setItem('sl_tracker_token', token)
  }, [token])
  return null
}
