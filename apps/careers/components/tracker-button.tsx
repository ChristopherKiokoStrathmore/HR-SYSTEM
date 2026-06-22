'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

export function TrackerButton() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    function refresh() {
      try {
        const tokens = JSON.parse(localStorage.getItem('sl_applications') ?? '[]') as string[]
        // Fall back to legacy single-token key
        if (tokens.length === 0) {
          const single = localStorage.getItem('sl_tracker_token')
          setCount(single ? 1 : 0)
        } else {
          setCount(tokens.length)
        }
      } catch {
        setCount(0)
      }
    }
    refresh()
    window.addEventListener('sl-tracker-saved', refresh)
    window.addEventListener('storage', refresh)
    return () => {
      window.removeEventListener('sl-tracker-saved', refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  if (count === 0) return null

  return (
    <Link
      href="/my-applications"
      title="View my applications"
      className="relative flex items-center gap-1.5 text-xs font-semibold text-accent border border-accent/30 bg-accent/5 hover:bg-accent/10 px-3 py-1.5 rounded-xl transition-all"
    >
      {/* pulse dot */}
      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent flex items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-60" />
        <span className="relative text-white text-[9px] font-black leading-none">{count > 9 ? '9+' : count}</span>
      </span>
      <ClipboardList className="w-4 h-4 flex-shrink-0" />
      <span className="hidden sm:inline">My Applications</span>
    </Link>
  )
}
