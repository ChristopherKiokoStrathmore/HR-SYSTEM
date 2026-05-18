'use client'

import { useState } from 'react'
import { FileText, Download, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { toast } from 'sonner'
import dayjs from 'dayjs'
import { usePayslips, formatPeriod, formatKES, type Payslip } from '@/lib/hooks/use-payslips'
import { useMe } from '@/lib/hooks/use-me'
import { useStore } from '@/lib/store'
import { t, type Language } from '@hr/i18n'

const STATUS_COLOR: Record<string, string> = {
  paid: '#22C55E',
  pending: '#EAB308',
  processing: '#1A2E5A',
  failed: '#EF4444',
}

function PayslipBreakdown({ slip, name, lang }: { slip: Payslip; name: string; lang: Language }) {
  const period = slip.payroll_run ? formatPeriod(slip.payroll_run.period_month, slip.payroll_run.period_year) : '—'

  const rows = [
    { label: t(lang, 'payslip.gross_salary'), amount: slip.gross_salary, positive: true },
    { label: t(lang, 'payslip.paye'), amount: -slip.paye },
    { label: t(lang, 'payslip.nssf'), amount: -slip.nssf },
    { label: t(lang, 'payslip.nhif'), amount: -slip.nhif },
    ...(slip.helb > 0 ? [{ label: t(lang, 'payslip.helb'), amount: -slip.helb }] : []),
    ...(slip.other_deductions > 0 ? [{ label: t(lang, 'payslip.other_deductions'), amount: -slip.other_deductions }] : []),
  ]

  async function downloadPdf() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    doc.setFontSize(18)
    doc.text('PAYSLIP', 105, 20, { align: 'center' })
    doc.setFontSize(12)
    doc.text(`Employee: ${name}`, 20, 40)
    doc.text(`Period: ${period}`, 20, 48)
    doc.line(20, 54, 190, 54)
    let y = 62
    rows.forEach(({ label, amount }) => {
      doc.text(label, 20, y)
      doc.text(formatKES(Math.abs(amount)), 170, y, { align: 'right' })
      y += 8
    })
    doc.line(20, y, 190, y)
    y += 8
    doc.setFontSize(14)
    doc.text(t(lang, 'payslip.net_salary'), 20, y)
    doc.text(formatKES(slip.net_salary), 170, y, { align: 'right' })
    doc.save(`payslip-${period.replace(' ', '-')}.pdf`)
    toast.success('Payslip downloaded!', { description: `${period} payslip saved to your device.` })
  }

  return (
    <div className="px-4 pb-4 space-y-3">
      <div className="space-y-1">
        {rows.map(({ label, amount, positive }) => (
          <div key={label} className="flex justify-between items-center py-1.5 border-b border-[#F1F5F9] last:border-0">
            <span className="text-sm text-text-body">{label}</span>
            <span className="text-sm font-semibold" style={{ color: positive ? '#1A2E5A' : '#EF4444' }}>
              {positive ? '' : '– '}{formatKES(Math.abs(amount))}
            </span>
          </div>
        ))}
        <div className="flex justify-between items-center py-2 pt-3">
          <span className="font-bold text-text-primary">{t(lang, 'payslip.net_salary')}</span>
          <span className="font-black text-lg" style={{ color: '#22C55E' }}>{formatKES(slip.net_salary)}</span>
        </div>
      </div>
      <motion.button
        onClick={downloadPdf}
        whileTap={{ scale: 0.97 }}
        className="w-full h-12 rounded-2xl border-2 font-semibold text-sm flex items-center justify-center gap-2"
        style={{ borderColor: '#F47920', color: '#F47920' }}
      >
        <Download className="w-4 h-4" />
        {t(lang, 'actions.download')} PDF
      </motion.button>
    </div>
  )
}

export default function PayslipPage() {
  const lang = useStore((s) => s.language) as Language
  const shouldReduce = useReducedMotion()
  const { data: payslips, isLoading } = usePayslips()
  const { data: me } = useMe()
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // dayjs available for future date formatting needs
  void dayjs

  return (
    <div className="px-4 pt-6 space-y-4 pb-4">
      <motion.h1
        className="text-2xl font-black text-text-primary tracking-tight"
        initial={shouldReduce ? false : { opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {t(lang, 'nav.payslip')}
      </motion.h1>

      {isLoading && (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white p-4 flex items-center gap-3" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div className="skeleton w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="skeleton h-4 w-28 rounded" />
                <div className="skeleton h-3 w-16 rounded" />
              </div>
              <div className="skeleton h-6 w-20 rounded" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && !payslips?.length && (
        <div className="rounded-2xl bg-white text-center py-12 text-text-muted text-sm" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          {t(lang, 'payslip.no_payslips')}
        </div>
      )}

      {!isLoading && (
        <div className="space-y-3">
          {payslips?.map((slip, i) => {
            const isExpanded = expandedId === slip.id
            const period = slip.payroll_run
              ? formatPeriod(slip.payroll_run.period_month, slip.payroll_run.period_year)
              : '—'

            return (
              <motion.div
                key={slip.id}
                layout
                initial={shouldReduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="overflow-hidden rounded-2xl bg-white"
                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
              >
                <motion.button
                  className="w-full flex items-center justify-between p-4"
                  onClick={() => setExpandedId(isExpanded ? null : slip.id)}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                         style={{ background: 'linear-gradient(135deg, #F47920, #E8650A)' }}>
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-semibold text-text-primary">{period}</p>
                      <p className="text-xs capitalize" style={{ color: STATUS_COLOR[slip.payment_status] ?? '#6B7280' }}>
                        {t(lang, `status.${slip.payment_status}`) || slip.payment_status}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-2">
                    <div>
                      <p className="font-black text-text-primary">{formatKES(slip.net_salary)}</p>
                      <p className="text-xs text-text-muted">{t(lang, 'payslip.net')}</p>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                      <ChevronDown className="w-4 h-4 text-text-muted" />
                    </motion.div>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeOut' }}
                    >
                      <div className="border-t border-[#F1F5F9]">
                        <PayslipBreakdown slip={slip} name={me?.user?.full_name ?? 'Employee'} lang={lang} />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
