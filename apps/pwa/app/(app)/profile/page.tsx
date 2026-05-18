'use client'

import { FileText, Globe, LogOut, ChevronRight } from 'lucide-react'
import { motion, useReducedMotion } from 'framer-motion'
import { useMe } from '@/lib/hooks/use-me'
import { useStore } from '@/lib/store'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@hr/shared'
import { t } from '@hr/i18n'

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null
  return (
    <div className="flex justify-between items-center py-2.5 border-b border-[#F1F5F9] last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-semibold text-text-primary text-right max-w-[60%]">{value}</span>
    </div>
  )
}

const sectionVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const sectionItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 280, damping: 22 } },
}

export default function ProfilePage() {
  const { data: me, isLoading } = useMe()
  const { language, setLanguage } = useStore()
  const shouldReduce = useReducedMotion()
  const router = useRouter()

  const user = me?.user
  const emp = me?.employee

  async function handleLogout() {
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const initials = user?.full_name
    ? user.full_name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  return (
    <div className="px-4 pt-6 pb-8">
      <motion.div variants={sectionVariants} initial="hidden" animate="show" className="space-y-5">
        {/* Avatar + name */}
        <motion.div variants={sectionItem} className="flex flex-col items-center py-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center mb-4"
            style={{
              background: 'linear-gradient(135deg, #1A2E5A, #2A4A8A)',
              boxShadow: '0 0 0 3px #F47920, 0 0 0 6px rgba(244,121,32,0.18)',
            }}
          >
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt={user.full_name} className="w-24 h-24 rounded-full object-cover" />
            ) : (
              <span className="text-white font-black text-3xl">{initials}</span>
            )}
          </div>
          <h1 className="text-2xl font-black text-text-primary">{isLoading ? '...' : user?.full_name}</h1>
          <p className="text-sm text-text-muted mt-0.5">{emp?.job_title}</p>
          {emp?.employee_number && (
            <p className="text-xs text-text-muted mt-0.5">#{emp.employee_number}</p>
          )}
        </motion.div>

        {/* Personal info */}
        {user && (
          <motion.div variants={sectionItem} className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <p className="font-bold text-text-primary mb-3 text-sm">{t(language, 'profile.personal_details')}</p>
            <InfoRow label={t(language, 'profile.email')} value={user.email} />
            <InfoRow label={t(language, 'profile.phone')} value={user.phone} />
            <InfoRow label={t(language, 'profile.department')} value={emp?.department} />
            <InfoRow label={t(language, 'profile.company')} value={emp?.company?.name} />
            <InfoRow label={t(language, 'profile.start_date')} value={emp?.start_date} />
          </motion.div>
        )}

        {/* Language toggle — iOS-style pill */}
        <motion.div variants={sectionItem} className="rounded-2xl bg-white p-5" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              <p className="font-semibold text-text-primary text-sm">{t(language, 'profile.language')}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-muted">{language === 'en' ? 'English' : 'Kiswahili'}</span>
              <button
                onClick={() => setLanguage(language === 'en' ? 'sw' : 'en')}
                className="relative w-14 h-7 rounded-full focus:outline-none transition-colors duration-200"
                style={{ background: language === 'sw' ? '#1A2E5A' : '#E2E8F0' }}
              >
                <motion.div
                  layout
                  className="absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-sm"
                  animate={{ left: language === 'sw' ? '1.75rem' : '0.125rem' }}
                  transition={shouldReduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Menu items */}
        <motion.div variants={sectionItem} className="space-y-2">
          <a
            href="#"
            className="rounded-2xl bg-white flex items-center gap-4 p-4 active:scale-98 transition-transform"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1A2E5A, #2A4A8A)' }}>
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="flex-1 font-semibold text-text-primary">{t(language, 'profile.documents')}</span>
            <ChevronRight className="w-4 h-4 text-text-muted" />
          </a>

          <motion.button
            onClick={handleLogout}
            whileTap={{ scale: 0.97 }}
            className="w-full rounded-2xl bg-white flex items-center gap-4 p-4 text-left border-2 border-danger/20"
            style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
          >
            <div className="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-danger" />
            </div>
            <span className="font-semibold text-danger">{t(language, 'profile.logout')}</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  )
}
