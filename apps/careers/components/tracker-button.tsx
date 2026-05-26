'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ClipboardList } from 'lucide-react'

export function TrackerButton() {
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    setToken(localStorage.getItem('sl_tracker_token'))
  }, [])

  if (!token) return null

  return (
    <Link
      href={`/track/${token}`}
      title="View my application status"
      className="relative flex items-center gap-1.5 text-xs font-semibold text-accent border border-accent/30 bg-accent/5 hover:bg-accent/10 px-3 py-1.5 rounded-xl transition-all"
    >
      {/* pulse dot */}
      <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent">
        <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-75" />
      </span>
      <ClipboardList className="w-4 h-4 flex-shrink-0" />
      <span className="hidden sm:inline">My Application</span>
    </Link>
  )
}
