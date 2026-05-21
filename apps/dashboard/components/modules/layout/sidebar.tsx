'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, UserPlus, ClipboardList,
  Calendar, Clock, DollarSign, TrendingUp, GraduationCap,
  Stethoscope, BarChart3, Settings, ChevronLeft, ChevronRight,
  Moon, Sun,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'

type Role = 'super_admin' | 'hr_admin' | 'manager' | 'employee'

const ALL_NAV = [
  { href: '/',             label: 'Dashboard',   icon: LayoutDashboard, roles: ['super_admin','hr_admin','manager'] },
  { href: '/employees',    label: 'Employees',   icon: Users,           roles: ['super_admin','hr_admin','manager'] },
  { href: '/recruitment',  label: 'Recruitment', icon: UserPlus,        roles: ['super_admin','hr_admin'] },
  { href: '/onboarding',   label: 'Onboarding',  icon: ClipboardList,   roles: ['super_admin','hr_admin'] },
  { href: '/leave',        label: 'Leave',       icon: Calendar,        roles: ['super_admin','hr_admin','manager'] },
  { href: '/attendance',   label: 'Attendance',  icon: Clock,           roles: ['super_admin','hr_admin','manager'] },
  { href: '/payroll',      label: 'Payroll',     icon: DollarSign,      roles: ['super_admin','hr_admin'] },
  { href: '/performance',  label: 'Performance', icon: TrendingUp,      roles: ['super_admin','hr_admin','manager'] },
  { href: '/training',     label: 'Training',    icon: GraduationCap,   roles: ['super_admin','hr_admin','manager'] },
  { href: '/medical',      label: 'Medical',     icon: Stethoscope,     roles: ['super_admin','hr_admin'] },
  { href: '/reports',      label: 'Reports',     icon: BarChart3,       roles: ['super_admin','hr_admin'] },
  { href: '/settings',     label: 'Settings',    icon: Settings,        roles: ['super_admin','hr_admin'] },
] as const

const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Admin',
  hr_admin:    'HR Admin',
  manager:     'Manager',
  employee:    'Employee',
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase() ?? '').join('') || '?'
}

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode } = useStore()
  const prefersReducedMotion = useReducedMotion()
  const { data: currentUser } = useCurrentUser()

  const role = (currentUser?.role ?? 'hr_admin') as Role
  const navItems = ALL_NAV.filter(item => (item.roles as readonly string[]).includes(role))

  const initials = currentUser?.full_name ? getInitials(currentUser.full_name) : '?'
  const displayName = currentUser?.full_name ?? 'Loading...'
  const roleLabel = ROLE_LABELS[role] ?? role

  return (
    <aside
      className={cn(
        'group flex flex-col text-white transition-all duration-300 ease-in-out flex-shrink-0 relative',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
      style={{ background: 'linear-gradient(160deg, #1A2E5A 0%, #0D1B3E 100%)' }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: '0 0 20px rgba(244,121,32,0.3)' }}
          >
            <span className="text-white font-bold text-sm">SL</span>
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">Sheer Logic</p>
              <p className="text-xs text-white/50 truncate">HR System</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2">
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== '/' && pathname.startsWith(href))
            return (
              <li key={href}>
                <Link
                  href={href}
                  title={sidebarCollapsed ? label : undefined}
                  className={cn(
                    'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors duration-200',
                    isActive ? 'text-white' : 'text-white/60 hover:text-white hover:bg-white/[0.08]'
                  )}
                >
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId={prefersReducedMotion ? undefined : 'sidebar-active-pill'}
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'linear-gradient(135deg, #F47920 0%, #E8650A 100%)',
                          boxShadow: '0 4px 12px rgba(244,121,32,0.35)',
                        }}
                        transition={prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                  </AnimatePresence>
                  <Icon className="relative z-10 w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="relative z-10">{label}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User profile section */}
      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-white/[0.08] cursor-pointer transition-colors">
          <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">{displayName}</p>
              <p className="text-white/40 text-[10px] truncate">{roleLabel}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dark mode toggle */}
      <div className="px-3 pb-3">
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Light mode' : 'Dark mode'}
          className={cn(
            'w-full flex items-center rounded-xl transition-colors duration-200 hover:bg-white/[0.08]',
            sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
          )}
        >
          {sidebarCollapsed ? (
            darkMode ? <Sun className="w-4 h-4 text-white/60" /> : <Moon className="w-4 h-4 text-white/60" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-white/60 text-xs font-medium">
                <Sun className="w-3.5 h-3.5" />
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </div>
              <Moon className="w-3.5 h-3.5 text-white/40" />
            </>
          )}
        </button>
      </div>

      {/* Collapse trigger */}
      <button
        onClick={toggleSidebar}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -right-3 top-[72px] z-50 w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-md"
        style={{ boxShadow: '0 2px 8px rgba(244,121,32,0.4)' }}
      >
        {sidebarCollapsed ? <ChevronRight className="w-3 h-3 text-white" /> : <ChevronLeft className="w-3 h-3 text-white" />}
      </button>
    </aside>
  )
}
