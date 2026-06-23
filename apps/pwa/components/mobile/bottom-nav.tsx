'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Calendar, Clock, FileText, User, ClipboardCheck } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useStore } from '@/lib/store'
import { useMe } from '@/lib/hooks/use-me'
import { t } from '@hr/i18n'

const navItems = [
  { href: '/home',       key: 'nav.home',       icon: Home },
  { href: '/leave',      key: 'nav.leave',      icon: Calendar },
  { href: '/attendance', key: 'nav.attendance',  icon: Clock, blueCollarOnly: true },
  { href: '/approvals',  key: 'nav.approvals',   icon: ClipboardCheck },
  { href: '/payslip',   key: 'nav.payslip',     icon: FileText },
  { href: '/profile',   key: 'nav.profile',     icon: User },
]

export function BottomNav() {
  const pathname = usePathname()
  const lang = useStore((s) => s.language)
  const shouldReduce = useReducedMotion()
  const { data: me } = useMe()
  const isBlueCollar = me?.employee?.worker_class === 'blue_collar'
  const visibleItems = navItems.filter((item) => !item.blueCollarOnly || isBlueCollar)

  return (
    <nav className="shrink-0 z-50"
         style={{ paddingBottom: 'env(safe-area-inset-bottom)', background: '#FFFFFF', boxShadow: '0 -1px 0 rgba(0,0,0,0.06), 0 -4px 16px rgba(0,0,0,0.06)' }}>
      <div className="flex items-center justify-around h-[68px] px-2 relative">
        {visibleItems.map(({ href, key, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5 relative py-2 group">
              {/* Gold indicator pill for active tab */}
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-pill"
                  className="absolute top-1 left-1/2 -translate-x-1/2 h-[3px] w-8 rounded-full"
                  style={{ background: 'linear-gradient(90deg, #C9A84C, #DEC571)' }}
                  transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              <motion.div
                animate={{ scale: isActive ? 1.15 : 1 }}
                transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Icon className="w-5 h-5" style={{ color: isActive ? '#80151B' : '#6B7280' }} />
              </motion.div>
              <span className="text-[10px] font-semibold"
                    style={{ color: isActive ? '#80151B' : '#6B7280' }}>
                {t(lang, key)}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
