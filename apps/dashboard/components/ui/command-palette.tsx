'use client'

import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard, Users, Calendar, Clock, DollarSign,
  TrendingUp, GraduationCap, Stethoscope, BarChart3,
  Settings, UserPlus, ClipboardList, Search, ArrowRight
} from 'lucide-react'

const pages = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard, group: 'Navigation' },
  { label: 'Employees', href: '/employees', icon: Users, group: 'Navigation' },
  { label: 'Recruitment', href: '/recruitment', icon: UserPlus, group: 'Navigation' },
  { label: 'Onboarding', href: '/onboarding', icon: ClipboardList, group: 'Navigation' },
  { label: 'Leave Management', href: '/leave', icon: Calendar, group: 'Navigation' },
  { label: 'Attendance', href: '/attendance', icon: Clock, group: 'Navigation' },
  { label: 'Payroll', href: '/payroll', icon: DollarSign, group: 'Navigation' },
  { label: 'Performance', href: '/performance', icon: TrendingUp, group: 'Navigation' },
  { label: 'Training', href: '/training', icon: GraduationCap, group: 'Navigation' },
  { label: 'Medical', href: '/medical', icon: Stethoscope, group: 'Navigation' },
  { label: 'Reports', href: '/reports', icon: BarChart3, group: 'Navigation' },
  { label: 'Settings', href: '/settings', icon: Settings, group: 'Navigation' },
]

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter()
  const shouldReduce = useReducedMotion()
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!open) setSearch('')
  }, [open])

  function navigate(href: string) {
    router.push(href)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: shouldReduce ? 0 : 0.15 }}
            onClick={onClose}
          />

          {/* Command panel */}
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white z-10"
            style={{ boxShadow: '0 16px 48px rgba(0,0,0,0.22)' }}
            initial={{ opacity: 0, scale: shouldReduce ? 1 : 0.94, y: shouldReduce ? 0 : -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: shouldReduce ? 1 : 0.96, y: shouldReduce ? 0 : -4 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          >
            <Command className="[&_[cmdk-group-heading]]:px-4 [&_[cmdk-group-heading]]:py-2 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-text-muted">
              {/* Search input */}
              <div className="flex items-center gap-3 border-b border-[#F1F5F9] px-4 py-3">
                <Search className="w-4 h-4 text-text-muted flex-shrink-0" />
                <Command.Input
                  value={search}
                  onValueChange={setSearch}
                  placeholder="Search pages, employees, actions..."
                  className="flex-1 bg-transparent text-sm text-text-body placeholder:text-text-muted focus:outline-none"
                  autoFocus
                />
                <kbd className="hidden sm:inline-flex items-center gap-1 rounded-md border border-border bg-surface-alt px-1.5 py-0.5 text-[10px] font-medium text-text-muted">
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-[320px] overflow-y-auto py-2">
                <Command.Empty className="py-8 text-center text-sm text-text-muted">
                  No results found.
                </Command.Empty>

                <Command.Group heading="Navigation">
                  {pages.map((page) => (
                    <Command.Item
                      key={page.href}
                      value={page.label}
                      onSelect={() => navigate(page.href)}
                      className="flex items-center gap-3 px-4 py-2.5 mx-2 rounded-xl cursor-pointer text-sm text-text-body
                                 data-[selected=true]:bg-[#F8FAFF] data-[selected=true]:text-text-primary
                                 transition-colors hover:bg-[#F8FAFF] group"
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                           style={{ background: 'linear-gradient(135deg, #1A2E5A, #2A4A8A)' }}>
                        <page.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="flex-1 font-medium">{page.label}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-text-muted opacity-0 group-data-[selected=true]:opacity-100 transition-opacity" />
                    </Command.Item>
                  ))}
                </Command.Group>
              </Command.List>

              {/* Footer */}
              <div className="border-t border-[#F1F5F9] px-4 py-2.5 flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                  <kbd className="rounded border border-border bg-surface-alt px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
                  <span>navigate</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                  <kbd className="rounded border border-border bg-surface-alt px-1 py-0.5 font-mono text-[10px]">↵</kbd>
                  <span>open</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-text-muted ml-auto">
                  <kbd className="rounded border border-border bg-surface-alt px-1 py-0.5 font-mono text-[10px]">⌘K</kbd>
                  <span>close</span>
                </div>
              </div>
            </Command>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
