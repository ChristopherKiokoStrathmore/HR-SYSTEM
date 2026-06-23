'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserPlus,
  ClipboardList,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  ShieldCheck,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Gavel,
  DoorOpen,
  MapPin,
  Timer,
  Receipt,
  ShieldOff,
  Megaphone,
  RotateCcw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/lib/store'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useCurrentUser, useRbac } from '@/lib/hooks/use-current-user'
import { roleLabel } from '@/lib/rbac'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/recruitment', label: 'Recruitment', icon: UserPlus },
  { href: '/background-checks', label: 'Background Checks', icon: ShieldCheck },
  { href: '/onboarding', label: 'Onboarding', icon: ClipboardList },
  { href: '/employees', label: 'Employees', icon: Users },
  { href: '/attendance', label: 'Attendance', icon: Clock },
  { href: '/attendance/geofence', label: 'Geofence', icon: MapPin },
  { href: '/performance', label: 'Performance', icon: TrendingUp },
  { href: '/payroll', label: 'Payroll', icon: DollarSign },
  { href: '/leave', label: 'Leave', icon: Calendar },
  { href: '/leave-recalls', label: 'Leave Recalls', icon: RotateCcw },
  { href: '/overtime', label: 'Overtime', icon: Timer },
  { href: '/reimbursements', label: 'Reimbursements', icon: Receipt },
  { href: '/disciplinary', label: 'Disciplinary', icon: Gavel },
  { href: '/exits', label: 'Exits', icon: DoorOpen },
  { href: '/compliance', label: 'Compliance', icon: ShieldOff },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/reports', label: 'Reports', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarCollapsed, toggleSidebar, darkMode, toggleDarkMode } = useStore()
  const prefersReducedMotion = useReducedMotion()
  const { role, canAccess } = useRbac()
  const { data: session } = useCurrentUser()
  const user = session?.user

  // Show only the modules this role is allowed to open.
  const visibleNav = navItems.filter((item) => canAccess(item.href))

  return (
    <aside
      className={cn(
        'group flex flex-col text-white transition-all duration-300 ease-in-out flex-shrink-0 relative',
        sidebarCollapsed ? 'w-16' : 'w-64'
      )}
      style={{ background: 'linear-gradient(160deg, #80151B 0%, #430A0D 60%, #0F0203 100%)' }}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0"
            style={{ boxShadow: '0 0 20px rgba(201,168,76,0.30)' }}
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
          {visibleNav.map(({ href, label, icon: Icon }) => {
            const isActive =
              pathname === href || (href !== '/' && pathname.startsWith(href))
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
                  {/* Animated active pill */}
                  <AnimatePresence>
                    {isActive && (
                      <motion.div
                        layoutId={prefersReducedMotion ? undefined : 'sidebar-active-pill'}
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: 'linear-gradient(135deg, #C9A84C 0%, #A8892A 100%)',
                          boxShadow: '0 4px 12px rgba(201,168,76,0.35)',
                        }}
                        transition={
                          prefersReducedMotion
                            ? { duration: 0 }
                            : { type: 'spring', stiffness: 500, damping: 35 }
                        }
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon + label sit above the pill */}
                  <Icon className="relative z-10 w-4 h-4 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="relative z-10">{label}</span>
                  )}
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
            <span className="text-white text-xs font-bold">
              {(user?.full_name || user?.email || 'U').trim().charAt(0).toUpperCase()}
            </span>
          </div>
          {!sidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-white text-xs font-medium truncate">
                {user?.full_name || user?.email || 'Signed in'}
              </p>
              <p className="text-white/40 text-[10px] truncate">{roleLabel(role)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Dark mode toggle */}
      <div className="px-3 pb-3">
        <button
          onClick={toggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          className={cn(
            'w-full flex items-center rounded-xl transition-all duration-200 hover:bg-white/[0.08]',
            sidebarCollapsed ? 'justify-center p-2.5' : 'justify-between px-3 py-2'
          )}
        >
          {sidebarCollapsed ? (
            darkMode
              ? <Sun className="w-4 h-4 text-amber-300" />
              : <Moon className="w-4 h-4 text-white/60" />
          ) : (
            <>
              <div className="flex items-center gap-2 text-white/70 text-xs font-medium">
                {darkMode
                  ? <Sun className="w-3.5 h-3.5 text-amber-300" />
                  : <Moon className="w-3.5 h-3.5" />}
                <span>{darkMode ? 'Light Mode' : 'Dark Mode'}</span>
              </div>
              {/* Toggle pill */}
              <div className={cn(
                'relative w-9 h-5 rounded-full transition-colors duration-300',
                darkMode ? 'bg-amber-400' : 'bg-white/20'
              )}>
                <span className={cn(
                  'absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-300',
                  darkMode ? 'translate-x-4' : 'translate-x-0.5'
                )} />
              </div>
            </>
          )}
        </button>
      </div>

      {/* Collapse trigger — visible on sidebar hover */}
      <button
        onClick={toggleSidebar}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute -right-3 top-[72px] z-50 w-6 h-6 rounded-full bg-accent flex items-center justify-center shadow-md"
        style={{ boxShadow: '0 2px 8px rgba(244,121,32,0.4)' }}
      >
        {sidebarCollapsed ? (
          <ChevronRight className="w-3 h-3 text-white" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-white" />
        )}
      </button>
    </aside>
  )
}
