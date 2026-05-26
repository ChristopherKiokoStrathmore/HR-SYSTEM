'use client'

import { useState } from 'react'
import { FileText, Globe, LogOut, ChevronRight, CreditCard, Banknote, Smartphone, X, Check, Loader2 } from 'lucide-react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { useMe, useUpdatePaymentMethod } from '@/lib/hooks/use-me'
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

const PAYMENT_METHODS = [
  { value: 'bank', label: 'Bank Transfer', icon: Banknote, color: 'text-primary' },
  { value: 'mpesa', label: 'M-Pesa', icon: Smartphone, color: 'text-green-600' },
  { value: 'airtel', label: 'Airtel Money', icon: Smartphone, color: 'text-red-600' },
] as const

interface PaymentMethodSectionProps {
  employee: {
    payment_method: 'bank' | 'mpesa' | 'airtel'
    bank_name: string | null
    bank_account: string | null
    mpesa_number: string | null
    airtel_number: string | null
  }
  language: 'en' | 'sw'
}

function PaymentMethodSection({ employee, language }: PaymentMethodSectionProps) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    payment_method: employee.payment_method,
    bank_name: employee.bank_name ?? '',
    bank_account: employee.bank_account ?? '',
    mpesa_number: employee.mpesa_number ?? '',
    airtel_number: employee.airtel_number ?? '',
  })
  const updatePayment = useUpdatePaymentMethod()

  const currentMethod = PAYMENT_METHODS.find(m => m.value === employee.payment_method)
  const CurrentIcon = currentMethod?.icon ?? CreditCard

  function getAccountDisplay() {
    if (employee.payment_method === 'bank') {
      return employee.bank_name ? `${employee.bank_name} - ${employee.bank_account ?? ''}` : 'Not set'
    } else if (employee.payment_method === 'mpesa') {
      return employee.mpesa_number ?? 'Not set'
    } else {
      return employee.airtel_number ?? 'Not set'
    }
  }

  async function handleSave() {
    try {
      await updatePayment.mutateAsync({
        payment_method: form.payment_method,
        bank_name: form.payment_method === 'bank' ? form.bank_name : undefined,
        bank_account: form.payment_method === 'bank' ? form.bank_account : undefined,
        mpesa_number: form.payment_method === 'mpesa' ? form.mpesa_number : undefined,
        airtel_number: form.payment_method === 'airtel' ? form.airtel_number : undefined,
      })
      setEditing(false)
    } catch (e) {
      console.error('Failed to update payment method:', e)
    }
  }

  function handleCancel() {
    setForm({
      payment_method: employee.payment_method,
      bank_name: employee.bank_name ?? '',
      bank_account: employee.bank_account ?? '',
      mpesa_number: employee.mpesa_number ?? '',
      airtel_number: employee.airtel_number ?? '',
    })
    setEditing(false)
  }

  return (
    <motion.div
      variants={sectionItem}
      className="rounded-2xl bg-white p-5"
      style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          <p className="font-bold text-text-primary text-sm">
            {language === 'en' ? 'Payment Method' : 'Njia ya Malipo'}
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-accent font-medium"
          >
            {language === 'en' ? 'Edit' : 'Hariri'}
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {editing ? (
          <motion.div
            key="edit"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            {/* Payment method selector */}
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map((method) => {
                const Icon = method.icon
                const isSelected = form.payment_method === method.value
                return (
                  <button
                    key={method.value}
                    onClick={() => setForm(f => ({ ...f, payment_method: method.value }))}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent/5'
                        : 'border-[#E2E8F0] hover:border-accent/50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-accent' : method.color}`} />
                    <span className={`text-xs font-medium ${isSelected ? 'text-accent' : 'text-text-muted'}`}>
                      {method.label.split(' ')[0]}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Conditional fields based on payment method */}
            {form.payment_method === 'bank' && (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Bank Name' : 'Jina la Benki'}
                  value={form.bank_name}
                  onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm focus:outline-none focus:border-accent"
                />
                <input
                  type="text"
                  placeholder={language === 'en' ? 'Account Number' : 'Nambari ya Akaunti'}
                  value={form.bank_account}
                  onChange={e => setForm(f => ({ ...f, bank_account: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm font-mono focus:outline-none focus:border-accent"
                />
              </div>
            )}

            {form.payment_method === 'mpesa' && (
              <input
                type="tel"
                placeholder={language === 'en' ? 'M-Pesa Number (07...)' : 'Nambari ya M-Pesa'}
                value={form.mpesa_number}
                onChange={e => setForm(f => ({ ...f, mpesa_number: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm font-mono focus:outline-none focus:border-accent"
              />
            )}

            {form.payment_method === 'airtel' && (
              <input
                type="tel"
                placeholder={language === 'en' ? 'Airtel Number (073...)' : 'Nambari ya Airtel'}
                value={form.airtel_number}
                onChange={e => setForm(f => ({ ...f, airtel_number: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl border border-[#E2E8F0] text-sm font-mono focus:outline-none focus:border-accent"
              />
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={handleCancel}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-medium text-text-muted"
              >
                <X className="w-4 h-4" />
                {language === 'en' ? 'Cancel' : 'Ghairi'}
              </button>
              <button
                onClick={handleSave}
                disabled={updatePayment.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-accent text-white text-sm font-medium disabled:opacity-50"
              >
                {updatePayment.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {language === 'en' ? 'Save' : 'Hifadhi'}
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="display"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="flex items-center gap-3 py-2">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #1A2E5A, #2A4A8A)' }}
              >
                <CurrentIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text-primary">{currentMethod?.label}</p>
                <p className="text-xs text-text-muted">{getAccountDisplay()}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
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

        {/* Payment Method Section */}
        {emp && <PaymentMethodSection employee={emp} language={language} />}

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
