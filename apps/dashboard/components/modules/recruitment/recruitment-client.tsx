'use client'

import { useState } from 'react'
import { useJobPostings, useDeleteJobPosting } from '@/lib/hooks/use-job-postings'
import { useCandidates } from '@/lib/hooks/use-candidates'
import { StatusBadge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { JobPostingModal } from './job-posting-modal'
import { CandidatePipeline } from './candidate-pipeline'
import { CvUploadModal } from './cv-upload-modal'
import { CandidateDrawer } from './candidate-drawer'
import { toast } from '@/lib/toast'
import type { JobPosting, CandidateWithPosting } from '@hr/shared'
import { Plus, Edit2, Trash2, Users, Briefcase, ChevronDown, ChevronUp, Link2, Check, Globe, Clock } from 'lucide-react'
import { useStore } from '@/lib/store'
import { formatDate } from '@hr/shared'
import { cn } from '@/lib/utils'
import { useRealtimeCandidates } from '@/lib/hooks/use-realtime-candidates'

export function RecruitmentClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [postingModal, setPostingModal] = useState(false)
  const [editPosting, setEditPosting] = useState<JobPosting | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [cvModal, setCvModal] = useState<{ postingId: string; title: string } | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [drawerCandidate, setDrawerCandidate] = useState<CandidateWithPosting | null>(null)
  const [feedOpen, setFeedOpen] = useState(true)

  // Live applications feed — last 12 candidates across all postings
  const { data: feedData } = useCandidates({})

  // Real-time: toast + cache invalidation when new applications arrive
  useRealtimeCandidates(activeCompanyId)

  function copyJobLink(id: string) {
    const base = process.env.NEXT_PUBLIC_CAREERS_URL ?? 'http://localhost:3002'
    navigator.clipboard.writeText(`${base}/jobs/${id}`).then(() => {
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  const { data, isLoading } = useJobPostings({ companyId: activeCompanyId ?? undefined })
  const deletePosting = useDeleteJobPosting()

  const postings = data?.data ?? []

  async function handleDelete(id: string) {
    if (!confirm('Close this job posting?')) return
    try {
      await deletePosting.mutateAsync(id)
      toast.success('Job posting closed')
      if (expandedId === id) setExpandedId(null)
    } catch {
      toast.error('Failed to close posting')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Recruitment</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {postings.length} active posting{postings.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setEditPosting(null); setPostingModal(true) }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Posting
        </button>
      </div>

      {/* ── Live Applications Feed ── */}
      {(() => {
        const allCandidates = feedData?.data ?? []
        const portalCount = allCandidates.filter((c) => c.source === 'portal').length
        const recentFeed = allCandidates.slice(0, 12)
        return (
          <div className="card p-0 overflow-hidden">
            <button
              onClick={() => setFeedOpen((o) => !o)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-alt transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Globe className="w-4 h-4 text-accent" />
                <span className="text-sm font-semibold text-text-primary">Live Applications</span>
                {portalCount > 0 && (
                  <span className="text-xs bg-accent text-white font-bold px-2 py-0.5 rounded-full">{portalCount} from portal</span>
                )}
              </div>
              {feedOpen ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
            </button>

            {feedOpen && (
              <div className="border-t border-border divide-y divide-border max-h-72 overflow-y-auto">
                {recentFeed.length === 0 ? (
                  <p className="text-sm text-text-muted text-center py-8">No applications yet.</p>
                ) : (
                  recentFeed.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setDrawerCandidate(c)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-surface-alt transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Users className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-text-primary truncate">{c.full_name}</p>
                          {c.source === 'portal' && (
                            <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-1.5 py-0.5 rounded-full">
                              <Globe className="w-2.5 h-2.5" /> Portal
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-text-muted truncate">
                          {(c as any).job_posting?.title ?? ''} · {c.current_stage.replace(/_/g, ' ')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {c.ai_score !== null && (
                          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                            c.ai_score >= 75 ? 'bg-green-100 text-green-700' :
                            c.ai_score >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'
                          )}>
                            {c.ai_score}%
                          </span>
                        )}
                        <div className="flex items-center gap-1 text-xs text-text-muted">
                          <Clock className="w-3 h-3" />
                          {formatDate(c.created_at)}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })()}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Open Postings', value: postings.filter(p => p.status === 'open').length, icon: Briefcase, color: 'text-green-600' },
          { label: 'On Hold', value: postings.filter(p => p.status === 'on_hold').length, icon: Briefcase, color: 'text-amber-600' },
          { label: 'Total Postings', value: postings.length, icon: Users, color: 'text-text-primary' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="card flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-surface-alt flex items-center justify-center">
              <Icon className={cn('w-5 h-5', color)} />
            </div>
            <div>
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-text-muted">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Postings list */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
            </div>
          ))
        ) : postings.length === 0 ? (
          <div className="card text-center py-16">
            <Briefcase className="w-12 h-12 text-border mx-auto mb-3" />
            <p className="text-text-muted">No job postings yet.</p>
            <button
              onClick={() => { setEditPosting(null); setPostingModal(true) }}
              className="btn-primary mt-4"
            >
              Create your first posting
            </button>
          </div>
        ) : (
          postings.map((posting) => {
            const isExpanded = expandedId === posting.id
            return (
              <div key={posting.id} className="card p-0 overflow-hidden">
                {/* Posting header row */}
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-semibold text-text-primary">{posting.title}</h3>
                      <StatusBadge status={posting.status} />
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">
                      {posting.department && <>{posting.department} · </>}
                      {posting.employment_type.replace('_', ' ')}
                      {posting.closing_date && <> · Closes {formatDate(posting.closing_date)}</>}
                    </p>
                    {posting.required_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {posting.required_keywords.slice(0, 5).map(k => (
                          <span key={k} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{k}</span>
                        ))}
                        {posting.required_keywords.length > 5 && (
                          <span className="text-xs text-text-muted">+{posting.required_keywords.length - 5}</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setCvModal({ postingId: posting.id, title: posting.title })}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent hover:text-accent transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add CV
                    </button>
                    <button
                      onClick={() => copyJobLink(posting.id)}
                      title="Copy public job link"
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent hover:text-accent transition-colors"
                    >
                      {copiedId === posting.id
                        ? <Check className="w-3.5 h-3.5 text-green-500" />
                        : <Link2 className="w-3.5 h-3.5" />}
                      {copiedId === posting.id ? 'Copied!' : 'Share link'}
                    </button>
                    <button
                      onClick={() => { setEditPosting(posting); setPostingModal(true) }}
                      className="p-2 rounded-lg hover:bg-surface-alt transition-colors text-text-muted hover:text-text-primary"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(posting.id)}
                      className="p-2 rounded-lg hover:bg-red-50 transition-colors text-text-muted hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : posting.id)}
                      className="p-2 rounded-lg hover:bg-surface-alt transition-colors text-text-muted"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Candidate pipeline (expanded) */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 bg-surface">
                    <h4 className="text-sm font-semibold text-text-primary mb-4">Candidate Pipeline</h4>
                    <CandidatePipeline
                      jobPostingId={posting.id}
                      onCandidateClick={setDrawerCandidate}
                    />
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Candidate detail drawer */}
      <CandidateDrawer
        candidate={drawerCandidate}
        onClose={() => setDrawerCandidate(null)}
      />

      {/* Modals */}
      <JobPostingModal
        open={postingModal}
        posting={editPosting}
        companyId={activeCompanyId ?? ''}
        onClose={() => { setPostingModal(false); setEditPosting(null) }}
      />
      {cvModal && (
        <CvUploadModal
          open={!!cvModal}
          jobPostingId={cvModal.postingId}
          jobTitle={cvModal.title}
          tenantId={activeCompanyId ?? ''}
          onClose={() => setCvModal(null)}
        />
      )}
    </div>
  )
}
