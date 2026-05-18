'use client'

import { useState } from 'react'
import {
  X, User, Mail, Phone, Calendar, Sparkles, CheckCircle2,
  AlertTriangle, Globe, BookOpen, ExternalLink, ChevronRight, Loader2,
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

interface Props {
  candidate: CandidateWithPosting | null
  onClose: () => void
}

export function CandidateDrawer({ candidate, onClose }: Props) {
  const [movingTo, setMovingTo] = useState<CandidateStage | null>(null)
  const moveStage = useUpdateCandidateStage()

  if (!candidate) return null

  const isPortal   = candidate.source === 'portal'
  const careersUrl = process.env.NEXT_PUBLIC_CAREERS_URL ?? 'http://localhost:3002'
  const currentStageDef = STAGES.find((s) => s.key === candidate.current_stage)

  async function handleMove(stage: CandidateStage) {
    if (candidate!.current_stage === stage || movingTo) return
    setMovingTo(stage)
    try {
      await moveStage.mutateAsync({ id: candidate!.id, stage })
      toast.success(`Moved to ${STAGES.find((s) => s.key === stage)?.label}`)
    } catch {
      toast.error('Failed to update stage')
    } finally {
      setMovingTo(null)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/25 backdrop-blur-sm"
        onClick={onClose}
      />

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

            {/* Stage mover */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Move to Stage</p>
              <div className="grid grid-cols-3 gap-2">
                {STAGES.map((s) => {
                  const isCurrent = candidate.current_stage === s.key
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

            {/* AI Screening results */}
            {candidate.ai_score !== null && (
              <div className="space-y-3">
                <p className="text-[10px] font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> AI Screening
                </p>
                <div className="card p-5 space-y-4">
                  {/* Score ring + bar */}
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

        {/* ── Footer: quick action buttons ── */}
        <div className="border-t border-border px-6 py-4 flex gap-3 flex-shrink-0">
          <a
            href={`mailto:${candidate.email}?subject=Re: Your application for ${(candidate as any).job_posting?.title ?? 'the position'}`}
            className="flex-1 flex items-center justify-center gap-2 text-sm font-semibold border border-border rounded-lg py-2.5 hover:border-accent hover:text-accent transition-colors"
          >
            <Mail className="w-4 h-4" /> Email candidate
          </a>
          {candidate.current_stage !== 'hired' && candidate.current_stage !== 'rejected' && (
            <button
              onClick={() => handleMove('interview_l1')}
              disabled={candidate.current_stage === 'interview_l1' || !!movingTo}
              className="flex-1 flex items-center justify-center gap-2 btn-primary py-2.5 text-sm disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
              {candidate.current_stage === 'screened' ? 'Advance to L1' : 'Next stage'}
            </button>
          )}
        </div>
      </aside>
    </>
  )
}
