import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@hr/shared'
import { CheckCircle2, Clock, ArrowLeft, Briefcase, Mail, Phone } from 'lucide-react'
import { TrackerTokenSaver } from '../../../components/tracker-token-saver'

export const metadata: Metadata = { title: 'Application Tracker | Sheer Logic Job Centre' }

// Pipeline stages in order
const STAGES = [
  {
    key:         'applied',
    label:       'Applied',
    description: 'Your application has been successfully received.',
  },
  {
    key:         'screened',
    label:       'Under Review',
    description: 'Our team is reviewing your application and matching it to the role requirements.',
  },
  {
    key:         'interview_l1',
    label:       'First Interview',
    description: "You've been shortlisted! Our team will contact you to arrange a first-round interview.",
  },
  {
    key:         'interview_l2',
    label:       'Final Interview',
    description: "Excellent progress — you've advanced to the final interview stage.",
  },
  {
    key:         'offer_sent',
    label:       'Offer Extended',
    description: "Congratulations! An offer has been extended. Please check your email for the details.",
  },
  {
    key:         'hired',
    label:       'Hired',
    description: "Welcome to the team! You've been selected for this position.",
  },
]

const STAGE_INDEX: Record<string, number> = {
  screened:      1,
  interview_l1:  2,
  interview_l2:  3,
  offer_sent:    4,
  hired:         5,
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function TrackPage({ params }: { params: { token: string } }) {
  const supabase = createServerClient(true)

  const { data } = await supabase
    .from('candidates')
    .select(`
      id, full_name, email, phone, current_stage, created_at,
      job_postings ( id, title, department, location_name, employment_type, closing_date )
    `)
    .eq('tracking_token', params.token)
    .single<{
      id: string
      full_name: string
      email: string
      phone: string | null
      current_stage: string
      created_at: string
      job_postings: { id: string; title: string; department: string | null; location_name: string | null; employment_type: string; closing_date: string | null } | null
    }>()

  if (!data) notFound()

  const currentStage = data.current_stage as string
  const isRejected   = currentStage === 'rejected'
  const activeIdx    = isRejected ? -1 : (STAGE_INDEX[currentStage] ?? 1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const job: any     = data.job_postings

  const currentStageDef = isRejected
    ? { label: 'Unsuccessful', description: "Thank you for your interest in this position. After careful consideration, we won't be moving forward with your application at this time. We encourage you to browse our other open positions." }
    : STAGES[activeIdx]

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20">
      <TrackerTokenSaver token={params.token} />

      {/* Back */}
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Browse all positions
      </Link>

      {/* Header card */}
      <div className="card p-7 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-1">
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Application Tracker</p>
            <h1 className="text-2xl font-extrabold text-text-primary">
              {job?.title ?? 'Position'}
            </h1>
            {job?.department && (
              <p className="text-sm text-text-muted flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5" />
                {job.department}
                {job.location_name && ` · ${job.location_name}`}
              </p>
            )}
          </div>
          {/* Status badge */}
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full border flex-shrink-0 ${
            isRejected           ? 'bg-red-50 text-red-600 border-red-200'
            : currentStage === 'hired' ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            {currentStageDef.label}
          </span>
        </div>

        <div className="flex flex-wrap gap-4 text-xs text-text-muted border-t border-border pt-4">
          <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> {data.email}</span>
          {data.phone && <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> {data.phone}</span>}
          <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Applied {formatDate(data.created_at)}</span>
        </div>
      </div>

      {/* ── Stage stepper ── */}
      {!isRejected && (
        <div className="card p-7 space-y-6">
          <h2 className="text-sm font-bold text-text-primary">Application Progress</h2>

          {/* Horizontal on md+, vertical on mobile */}
          <div className="hidden md:flex items-start">
            {STAGES.map((stage, i) => {
              const isDone    = i < activeIdx || (currentStage === 'hired' && i === activeIdx)
              const isCurrent = i === activeIdx && currentStage !== 'hired'
              const isFuture  = i > activeIdx && currentStage !== 'hired'
              return (
                <div key={stage.key} className="flex items-start flex-1 min-w-0">
                  <div className="flex flex-col items-center gap-1.5 flex-1">
                    {/* Circle */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm transition-all ${
                      isDone    ? 'bg-green-500 text-white shadow-sm'
                      : isCurrent ? 'bg-accent text-white ring-4 ring-accent/20 shadow-md'
                      : 'bg-surface-alt text-text-muted border-2 border-border'
                    }`}>
                      {isDone ? <CheckCircle2 className="w-4.5 h-4.5" /> : i + 1}
                    </div>
                    {/* Label */}
                    <span className={`text-[11px] font-semibold text-center leading-tight ${
                      isDone ? 'text-green-600' : isCurrent ? 'text-accent' : 'text-text-muted'
                    }`}>
                      {stage.label}
                    </span>
                  </div>
                  {/* Connector */}
                  {i < STAGES.length - 1 && (
                    <div className={`h-0.5 flex-1 mt-4 mx-1 transition-colors ${(isDone || currentStage === 'hired') ? 'bg-green-300' : 'bg-border'}`} />
                  )}
                </div>
              )
            })}
          </div>

          {/* Vertical (mobile) */}
          <div className="md:hidden space-y-0">
            {STAGES.map((stage, i) => {
              const isDone    = i < activeIdx || (currentStage === 'hired' && i === activeIdx)
              const isCurrent = i === activeIdx && currentStage !== 'hired'
              return (
                <div key={stage.key} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                      isDone    ? 'bg-green-500 text-white'
                      : isCurrent ? 'bg-accent text-white ring-4 ring-accent/20'
                      : 'bg-surface-alt text-text-muted border-2 border-border'
                    }`}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className={`w-0.5 h-8 ${isDone ? 'bg-green-300' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="pb-6">
                    <p className={`text-sm font-semibold ${isDone ? 'text-green-600' : isCurrent ? 'text-accent' : 'text-text-muted'}`}>
                      {stage.label}
                    </p>
                    {isCurrent && (
                      <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{stage.description}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Current stage message */}
          <div className={`rounded-xl p-5 space-y-1 ${
            currentStage === 'hired'
              ? 'bg-green-50 border border-green-200'
              : 'bg-accent/5 border border-accent/20'
          }`}>
            <p className={`text-sm font-bold ${currentStage === 'hired' ? 'text-green-700' : 'text-accent'}`}>
              {currentStage === 'hired' ? '🎉 ' : ''}{currentStageDef.label}
            </p>
            <p className="text-sm text-text-muted leading-relaxed">{currentStageDef.description}</p>
          </div>
        </div>
      )}

      {/* Rejected state */}
      {isRejected && (
        <div className="card p-7 space-y-4">
          <div className="text-center space-y-3 py-4">
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto">
              <span className="text-2xl">😔</span>
            </div>
            <h2 className="font-bold text-text-primary">Application Unsuccessful</h2>
            <p className="text-sm text-text-muted max-w-md mx-auto leading-relaxed">
              {currentStageDef.description}
            </p>
          </div>
        </div>
      )}

      {/* What happens next */}
      {!isRejected && currentStage !== 'hired' && (
        <div className="card p-6 space-y-3">
          <h3 className="text-sm font-bold text-text-primary">What happens next?</h3>
          <ul className="space-y-2 text-sm text-text-muted">
            <li className="flex gap-2">
              <span className="text-accent font-bold flex-shrink-0">1.</span>
              Our recruitment team reviews all applications against the role requirements.
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold flex-shrink-0">2.</span>
              Shortlisted candidates are contacted within 5–7 business days by phone or email.
            </li>
            <li className="flex gap-2">
              <span className="text-accent font-bold flex-shrink-0">3.</span>
              This page updates automatically as your application moves through each stage.
            </li>
          </ul>
          <p className="text-xs text-text-muted pt-1">
            Questions? Email us at{' '}
            <a href="mailto:careers@sheerlogicltd.com" className="text-accent hover:underline">
              careers@sheerlogicltd.com
            </a>
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="text-center space-y-2">
        <p className="text-sm text-text-muted">
          {isRejected ? 'Explore other opportunities:' : 'While you wait:'}
        </p>
        <Link href="/jobs" className="btn-primary px-6 py-2.5 inline-flex items-center gap-2 text-sm">
          <Briefcase className="w-4 h-4" />
          Browse open positions
        </Link>
      </div>
    </div>
  )
}
