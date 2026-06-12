'use client'

import { useState, useEffect } from 'react'
import {
  X, User, Mail, Phone, Calendar, Sparkles, CheckCircle2,
  AlertTriangle, Globe, BookOpen, ExternalLink, ChevronRight,
  Loader2, Send, FileText,
} from 'lucide-react'
import type { CandidateWithPosting, CandidateStage } from '@hr/shared'
import { useUpdateCandidateStage } from '@/lib/hooks/use-candidates'
import { toast } from '@/lib/toast'
import { cn } from '@/lib/utils'
import { formatDate } from '@hr/shared'

const STAGES: { key: CandidateStage; label: string; color: string }[] = [
  { key: 'screened',     label: 'Screened',     color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-200' },
  { key: 'interview_l1', label: 'L1 Interview',  color: 'bg-purple-50 text-purple-700 border-purple-200 ring-purple-200' },
  { key: 'interview_l2', label: 'L2 Interview',  color: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-200' },
  { key: 'offer_sent',   label: 'Offer Sent',    color: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-200' },
  { key: 'hired',        label: 'Hired',         color: 'bg-green-50 text-green-700 border-green-200 ring-green-200' },
  { key: 'rejected',     label: 'Rejected',      color: 'bg-red-50 text-red-600 border-red-200 ring-red-200' },
]

// Maps each stage to the next one in the pipeline
const NEXT_STAGE: Partial<Record<CandidateStage, CandidateStage>> = {
  screened:     'interview_l1',
  interview_l1: 'interview_l2',
  interview_l2: 'offer_sent',
  offer_sent:   'hired',
}

const NEXT_STAGE_LABEL: Partial<Record<CandidateStage, string>> = {
  screened:     'Advance to L1 Interview',
  interview_l1: 'Advance to L2 Interview',
  interview_l2: 'Send Offer',
  offer_sent:   'Mark as Hired',
}

// Pre-written email templates for each stage transition
function buildStageEmail(
  candidateName: string,
  jobTitle: string,
  targetStage: CandidateStage,
): { subject: string; body: string } | null {
  const first = candidateName.split(' ')[0]

  switch (targetStage) {
    case 'interview_l1':
      return {
        subject: `Interview Invitation — ${jobTitle}`,
        body: `Dear ${first},\n\nThank you for applying for the ${jobTitle} position at Sheer Logic.\n\nWe have reviewed your application and are pleased to invite you for a first-round interview. We were impressed with your background and believe you could be a strong fit for our team.\n\nKindly reply to this email with your availability over the next few days so we can schedule a convenient time.\n\nWe look forward to speaking with you.\n\nWarm regards,\nHR Team\nSheer Logic`,
      }
    case 'interview_l2':
      return {
        subject: `Second Round Interview Invitation — ${jobTitle}`,
        body: `Dear ${first},\n\nCongratulations! Following your first-round interview for the ${jobTitle} position, we are delighted to inform you that you have been selected to proceed to the second and final round of interviews.\n\nThis is a great achievement and reflects the strong impression you made. Please reply with your availability so we can arrange the second interview at your earliest convenience.\n\nWe look forward to continuing our conversation.\n\nWarm regards,\nHR Team\nSheer Logic`,
      }
    case 'offer_sent':
      return {
        subject: `Job Offer — ${jobTitle} | Sheer Logic`,
        body: `Dear ${first},\n\nWe are thrilled to offer you the position of ${jobTitle} at Sheer Logic!\n\nAfter a thorough and competitive selection process, you stood out as our top candidate. Please find below the key details of our offer:\n\n• Position: ${jobTitle}\n• Start Date: [To be confirmed]\n• Compensation: [As discussed]\n• Contract Type: [Permanent / Contract]\n\nA formal offer letter with full terms and conditions is attached. Please review it carefully and confirm your acceptance by responding to this email within 5 business days.\n\nDo not hesitate to reach out if you have any questions.\n\nWith excitement,\nHR Team\nSheer Logic`,
      }
    case 'hired':
      return {
        subject: `Welcome to Sheer Logic! — Official Acceptance Letter`,
        body: `Dear ${first},\n\n═══════════════════════════════════\n   LETTER OF ACCEPTANCE\n   Sheer Logic Limited\n═══════════════════════════════════\n\nDate: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}\n\nDear ${candidateName},\n\nRe: Appointment to the Position of ${jobTitle}\n\nOn behalf of Sheer Logic Limited, it is with great pleasure that we confirm your acceptance and appointment to the position of ${jobTitle}.\n\nYour start date, reporting instructions, and onboarding schedule will be communicated to you separately by our HR team. Please bring the following on your first day:\n  • National ID / Passport\n  • KRA PIN certificate\n  • NSSF & NHIF membership details\n  • Academic and professional certificates\n  • Bank account details for payroll\n\nWe are confident you will be an invaluable addition to our team and look forward to a long and successful working relationship.\n\nOnce again, congratulations and welcome to Sheer Logic!\n\nYours sincerely,\n\n_________________________\nHR Manager\nSheer Logic Limited`,
      }
    case 'rejected':
      return {
        subject: `Your Application for ${jobTitle} — Sheer Logic`,
        body: `Dear ${first},\n\nThank you sincerely for the time you invested in applying for the ${jobTitle} position at Sheer Logic, and for your interest in joining our team.\n\nAfter careful review of all applications, we regret to inform you that we will not be moving forward with your candidacy at this stage. This was a very competitive process and the decision was not easy.\n\nWe were genuinely impressed by your profile and encourage you to keep an eye on future openings at Sheer Logic that may be a match for your skills and experience.\n\nWe wish you the very best in your career journey ahead.\n\nKind regards,\nHR Team\nSheer Logic Limited`,
      }
    default:
      return null
  }
}

function openMailTo(email: string, subject: string, body: string) {
  window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

interface Props {
  candidate: CandidateWithPosting | null
  onClose: () => void
}

export function CandidateDrawer({ candidate, onClose }: Props) {
  const [movingTo, setMovingTo] = useState<CandidateStage | null>(null)
  const [localStage, setLocalStage] = useState<CandidateStage | null>(candidate?.current_stage ?? null)
  const moveStage = useUpdateCandidateStage()

  // Sync local stage when a different candidate is opened
  useEffect(() => {
    setLocalStage(candidate?.current_stage ?? null)
  }, [candidate?.id])

  if (!candidate || !localStage) return null

  const isPortal   = candidate.source === 'portal'
  const careersUrl = process.env.NEXT_PUBLIC_CAREERS_URL ?? 'http://localhost:3002'
  const currentStageDef = STAGES.find((s) => s.key === localStage)
  const nextStage = NEXT_STAGE[localStage]
  const nextStageLabel = NEXT_STAGE_LABEL[localStage]
  const jobTitle = (candidate as any).job_posting?.title ?? 'the position'

  async function handleMove(stage: CandidateStage, sendEmail = false) {
    if (localStage === stage || movingTo) return
    setMovingTo(stage)
    try {
      await moveStage.mutateAsync({ id: candidate!.id, stage })
      setLocalStage(stage)
      const stageName = STAGES.find((s) => s.key === stage)?.label ?? stage
      toast.success(`Moved to ${stageName}`)

      if (sendEmail) {
        const tpl = buildStageEmail(candidate!.full_name, jobTitle, stage)
        if (tpl) openMailTo(candidate!.email, tpl.subject, tpl.body)
      }
    } catch {
      toast.error('Failed to update stage')
    } finally {
      setMovingTo(null)
    }
  }

  function handleStageEmail(stage: CandidateStage) {
    const tpl = buildStageEmail(candidate!.full_name, jobTitle, stage)
    if (tpl) openMailTo(candidate!.email, tpl.subject, tpl.body)
  }

  const isTerminal = localStage === 'hired' || localStage === 'rejected'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer panel */}
      <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-[480px] bg-surface border-l border-border shadow-2xl flex flex-col">

        {/* ── Header ── */}
        <div className="flex items-start gap-3 px-6 py-5 border-b border-border flex-shrink-0">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-text-primary">{candidate.full_name}</h2>
              {isPortal && (
                <span className="flex items-center gap-1 text-[10px] font-bold bg-accent/10 text-accent border border-accent/25 px-2 py-0.5 rounded-full tracking-wide">
                  <Globe className="w-2.5 h-2.5" /> Job Portal
                </span>
              )}
            </div>
            <p className="text-xs text-text-muted truncate">
              {(candidate as any).job_posting?.title ?? 'Unknown posting'}
              {(candidate as any).job_posting?.department && ` · ${(candidate as any).job_posting.department}`}
            </p>
            {currentStageDef && (
              <span className={cn('inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border mt-1', currentStageDef.color)}>
                {currentStageDef.label}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-alt transition-colors text-text-muted flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-6 py-5 space-y-7">

            {/* Contact */}
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">Contact</p>
              <a href={`mailto:${candidate.email}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-alt transition-colors group">
                <Mail className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-body group-hover:text-accent">{candidate.email}</span>
              </a>
              {candidate.phone && (
                <a href={`tel:${candidate.phone}`}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-alt transition-colors group">
                  <Phone className="w-4 h-4 text-text-muted" />
                  <span className="text-sm text-text-body">{candidate.phone}</span>
                </a>
              )}
              <div className="flex items-center gap-3 px-3 py-2">
                <Calendar className="w-4 h-4 text-text-muted" />
                <span className="text-sm text-text-muted">Applied {formatDate(candidate.created_at)}</span>
              </div>
              {isPortal && candidate.tracking_token && (
                <a
                  href={`${careersUrl}/track/${candidate.tracking_token}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-alt transition-colors group"
                >
                  <ExternalLink className="w-4 h-4 text-text-muted" />
                  <span className="text-sm text-accent group-hover:underline">Candidate tracker page ↗</span>
                </a>
              )}
            </div>

            {/* ── Stage mover ── */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Move to Stage</p>
              <div className="grid grid-cols-3 gap-2">
                {STAGES.map((s) => {
                  const isCurrent = localStage === s.key
                  const isLoading = movingTo === s.key
                  return (
                    <button
                      key={s.key}
                      onClick={() => handleMove(s.key)}
                      disabled={!!movingTo}
                      className={cn(
                        'text-xs font-semibold px-2 py-2 rounded-lg border transition-all flex items-center justify-center gap-1',
                        isCurrent
                          ? cn(s.color, 'ring-1 ring-offset-1 ring-current')
                          : 'border-border text-text-muted hover:border-accent hover:text-accent',
                        movingTo && !isLoading && 'opacity-40 cursor-not-allowed',
                      )}
                    >
                      {isLoading
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : isCurrent && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                      {s.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Quick email templates ── */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Email Templates</p>
              <div className="space-y-1.5">
                {([
                  { stage: 'interview_l1' as CandidateStage, label: 'L1 Interview Invite' },
                  { stage: 'interview_l2' as CandidateStage, label: 'L2 Interview Invite' },
                  { stage: 'offer_sent'   as CandidateStage, label: 'Job Offer Letter' },
                  { stage: 'hired'        as CandidateStage, label: 'Acceptance Letter' },
                  { stage: 'rejected'     as CandidateStage, label: 'Rejection Notice' },
                ] as const).map(({ stage, label }) => (
                  <button
                    key={stage}
                    onClick={() => handleStageEmail(stage)}
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border border-border hover:border-accent hover:text-accent text-text-muted transition-colors text-left"
                  >
                    <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="text-xs font-medium">{label}</span>
                    <span className="ml-auto text-[10px] opacity-50">Open in email →</span>
                  </button>
                ))}
              </div>
            </div>

            {/* AI Screening results */}
            {candidate.ai_score !== null && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> AI Screening
                </p>
                <div className="card p-5 space-y-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-lg border-4',
                      candidate.ai_score >= 75 ? 'border-green-400 text-green-700 bg-green-50'
                        : candidate.ai_score >= 50 ? 'border-amber-400 text-amber-700 bg-amber-50'
                        : 'border-red-400 text-red-600 bg-red-50',
                    )}>
                      {candidate.ai_score}%
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-text-muted">Match score</span>
                        <span className={cn('font-bold',
                          candidate.ai_score >= 75 ? 'text-green-600'
                          : candidate.ai_score >= 50 ? 'text-amber-600' : 'text-red-600'
                        )}>
                          {candidate.ai_score >= 75 ? 'Strong match' : candidate.ai_score >= 50 ? 'Partial match' : 'Low match'}
                        </span>
                      </div>
                      <div className="h-2.5 bg-border rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full transition-all duration-700',
                            candidate.ai_score >= 75 ? 'bg-green-500'
                            : candidate.ai_score >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${candidate.ai_score}%` }}
                        />
                      </div>
                      {candidate.ai_experience_years != null && (
                        <div className="flex items-center gap-1.5 text-xs text-text-muted pt-0.5">
                          <BookOpen className="w-3 h-3" />
                          {candidate.ai_experience_years} yr exp
                          {candidate.ai_education && ` · ${candidate.ai_education}`}
                        </div>
                      )}
                    </div>
                  </div>

                  {candidate.ai_summary && (
                    <p className="text-sm text-text-muted leading-relaxed border-t border-border pt-3">
                      {candidate.ai_summary}
                    </p>
                  )}

                  {candidate.ai_extracted_skills.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold text-text-muted">Identified skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {candidate.ai_extracted_skills.map((s) => (
                          <span key={s} className="text-xs bg-primary/5 text-primary border border-primary/10 px-2.5 py-0.5 rounded-full font-medium">
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cover note */}
            {candidate.notes && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Cover Note</p>
                <div className="bg-surface-alt border border-border rounded-xl p-4">
                  <p className="text-sm text-text-body leading-relaxed whitespace-pre-wrap">{candidate.notes}</p>
                </div>
              </div>
            )}

            {/* CV text */}
            {candidate.cv_text && (
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">CV / Resume</p>
                <div className="bg-surface-alt border border-border rounded-xl p-4 max-h-72 overflow-y-auto">
                  <pre className="text-xs text-text-muted leading-relaxed whitespace-pre-wrap font-sans">{candidate.cv_text}</pre>
                </div>
              </div>
            )}

            {/* Rejection reason */}
            {candidate.rejection_reason && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-1">
                <p className="text-xs font-bold text-red-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Rejection note
                </p>
                <p className="text-xs text-red-600">{candidate.rejection_reason}</p>
              </div>
            )}

          </div>
        </div>

        {/* ── Footer ── */}
        <div className="border-t border-border px-6 py-4 flex-shrink-0 space-y-2">
          {/* Advance + Send email combined action */}
          {!isTerminal && nextStage && (
            <div className="flex gap-2">
              <button
                onClick={() => handleMove(nextStage)}
                disabled={!!movingTo}
                className="flex-1 flex items-center justify-center gap-2 btn-primary py-2.5 text-sm disabled:opacity-50"
              >
                {movingTo === nextStage
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <ChevronRight className="w-4 h-4" />}
                {nextStageLabel}
              </button>
              <button
                onClick={() => handleMove(nextStage, true)}
                disabled={!!movingTo}
                title="Advance & send notification email"
                className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg border border-border hover:border-accent hover:text-accent text-text-muted text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                + Email
              </button>
            </div>
          )}

          {/* General email candidate */}
          <a
            href={`mailto:${candidate.email}?subject=Re:%20Your%20application%20for%20${encodeURIComponent(jobTitle)}`}
            className="w-full flex items-center justify-center gap-2 text-sm font-semibold border border-border rounded-lg py-2.5 hover:border-accent hover:text-accent transition-colors"
          >
            <Mail className="w-4 h-4" /> Email candidate
          </a>
        </div>
      </aside>
    </>
  )
}
