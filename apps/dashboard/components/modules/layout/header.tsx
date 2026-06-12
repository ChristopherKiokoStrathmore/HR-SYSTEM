'use client'

import { Bell, Search, Moon, Sun, LogOut, Building2 } from 'lucide-react'
import { useStore } from '@/lib/store'
import { createBrowserClient } from '@hr/shared'
import { useRouter, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'

function CompanySwitcher() {
  const { activeCompanyId, setActiveCompanyId } = useStore()
  const { data } = useQuery({
    queryKey: ['companies-list'],
    queryFn: () => fetch('/api/companies?pageSize=50').then(r => r.json()),
    staleTime: 5 * 60 * 1000,
  })
  const companies: { id: string; name: string }[] = data?.data ?? []

  // Auto-select the first company, or reset a stale persisted ID that no longer exists
  useEffect(() => {
    if (companies.length === 0) return
    const ids = companies.map((c) => c.id)
    if (!activeCompanyId || !ids.includes(activeCompanyId)) {
      setActiveCompanyId(companies[0].id)
    }
  }, [companies, activeCompanyId, setActiveCompanyId])

  if (companies.length < 2) return null
  return (
    <div className="flex items-center gap-1.5 rounded-xl border border-border bg-surface-alt px-2.5 py-1.5">
      <Building2 className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
      <select
        value={activeCompanyId ?? ''}
        onChange={e => setActiveCompanyId(e.target.value || null)}
        className="bg-transparent text-xs text-text-body font-medium focus:outline-none cursor-pointer pr-1 max-w-[140px] truncate"
      >
        <option value="">All Companies</option>
        {companies.map(c => (
          <option key={c.id} value={c.id}>{c.name}</option>
        ))}
      </select>
    </div>
  )
}

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.replace('/dashboard', '').split('/').filter(Boolean)
  const crumbs = ['Dashboard', ...segments.map((s) => s.charAt(0).toUpperCase() + s.slice(1))]

  return (
    <nav className="flex items-center gap-1.5 text-sm" aria-label="Breadcrumb">
      {crumbs.map((crumb, i) => (
        <span key={crumb} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-text-muted/50 select-none">/</span>}
          <span
            className={
              i === crumbs.length - 1
                ? 'font-semibold text-text-primary'
                : 'text-text-muted hover:text-text-body transition-colors'
            }
          >
            {crumb}
          </span>
        </span>
      ))}
    </nav>
  )
}

export function Header() {
  const { darkMode, toggleDarkMode } = useStore()
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <header className="h-16 bg-surface border-b border-[#F1F5F9] flex items-center justify-between px-6 flex-shrink-0">
      {/* Left: breadcrumb + search */}
      <div className="flex items-center gap-6 min-w-0">
        <Breadcrumbs />

        {/* Cmd+K search hint pill */}
        <button
          onClick={() => {/* global hotkey via CommandPaletteTrigger */}}
          className="hidden lg:flex items-center gap-2 rounded-full border border-border bg-surface-alt px-3 py-1.5 text-sm text-text-muted hover:border-accent/40 transition-colors"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="text-xs">Search...</span>
          <kbd className="ml-1 rounded border border-border bg-surface px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
        </button>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2">
        <CompanySwitcher />
        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-xl text-text-muted hover:text-text-body hover:bg-surface-alt transition-colors"
          title={darkMode ? 'Light mode' : 'Dark mode'}
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Notification bell with animated pulse dot */}
        <div className="relative">
          <button className="p-2 rounded-xl hover:bg-surface-alt transition-colors">
            <Bell className="w-4 h-4 text-text-muted" />
          </button>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
        </div>

        {/* Divider */}
        <div className="w-px h-5 bg-border mx-1" />

        {/* User initials avatar + sign out */}
        <div className="flex items-center gap-1">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ring-2 ring-transparent hover:ring-accent/40 transition-all cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #1A2E5A, #2A4A8A)' }}
            title="HR Admin"
          >
            <span className="text-white text-xs font-bold select-none">HR</span>
          </div>

          <button
            onClick={handleSignOut}
            className="p-2 rounded-xl text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
