'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { SkeletonTable } from '@/components/ui/skeleton'
import { Avatar } from '@/components/ui/avatar'
import { Modal } from '@/components/ui/modal'
import { StatusBadge } from '@/components/ui/badge'
import { toast } from '@/lib/toast'
import { useStore } from '@/lib/store'
import { formatDate, isExpiringSoon, isExpired } from '@hr/shared'
import type { BackgroundCheckWithSubject, BackgroundCheckType, BackgroundCheckStatus } from '@hr/shared'
import {
  ShieldCheck, Plus, AlertTriangle, CheckCircle, XCircle,
  Clock, FileSearch, Loader2, Flag, Eye, HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  BackgroundCheckTutorial,
  useTutorialState,
  useDemoMode,
  MOCK_BACKGROUND_CHECKS,
  MOCK_CANDIDATES,
  MOCK_EMPLOYEES,
  type TutorialRefs,
} from './tutorial'

// Form schema for creating a background check
const createCheckSchema = z.object({
  employee_id: z.string().uuid().optional().nullable(),
  candidate_id: z.string().uuid().optional().nullable(),
  check_type: z.enum(['criminal', 'credit', 'employment', 'education', 'professional']),
  document_url: z.string().url().optional().or(z.literal('')),
  clearance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  notes: z.string().optional(),
}).refine(
  (data) => data.employee_id || data.candidate_id,
  { message: 'Either employee or candidate is required' }
)

// Form schema for reviewing a background check
const reviewCheckSchema = z.object({
  status: z.enum(['passed', 'failed', 'flagged']),
  result_summary: z.string().min(1, 'Summary is required'),
  clearance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  expiry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal('')),
  flags: z.string().optional(),
  notes: z.string().optional(),
})

type CreateCheckForm = z.infer<typeof createCheckSchema>
type ReviewCheckForm = z.infer<typeof reviewCheckSchema>

const CHECK_TYPE_LABELS: Record<BackgroundCheckType, string> = {
  criminal: 'Criminal Record (PCC)',
  credit: 'Credit Check',
  employment: 'Employment Verification',
  education: 'Education Verification',
  professional: 'Professional License',
}

const STATUS_CONFIG: Record<BackgroundCheckStatus, { icon: typeof CheckCircle; color: string; bg: string }> = {
  pending: { icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50' },
  in_progress: { icon: FileSearch, color: 'text-blue-600', bg: 'bg-blue-50' },
  completed: { icon: Eye, color: 'text-purple-600', bg: 'bg-purple-50' },
  passed: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  failed: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  flagged: { icon: Flag, color: 'text-amber-600', bg: 'bg-amber-50' },
}

function AddCheckModal({
  open, companyId, onClose, demoMode = false,
}: {
  open: boolean
  companyId: string
  onClose: () => void
  demoMode?: boolean
}) {
  const qc = useQueryClient()
  const [subjectType, setSubjectType] = useState<'employee' | 'candidate'>('candidate')
  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<CreateCheckForm>({
    resolver: zodResolver(createCheckSchema),
    defaultValues: { check_type: 'criminal' },
  })

  // Fetch employees (skip in demo mode)
  const { data: empData } = useQuery({
    queryKey: ['employees-list', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/employees?companyId=${companyId}&pageSize=200`)
      return res.json()
    },
    enabled: !!companyId && subjectType === 'employee' && !demoMode,
  })

  // Fetch candidates (skip in demo mode)
  const { data: candData } = useQuery({
    queryKey: ['candidates-list', companyId],
    queryFn: async () => {
      const res = await fetch(`/api/candidates?companyId=${companyId}&pageSize=200`)
      return res.json()
    },
    enabled: !!companyId && subjectType === 'candidate' && !demoMode,
  })

  // Use mock data in demo mode
  const employees = demoMode ? MOCK_EMPLOYEES : (empData?.data ?? [])
  const candidates = demoMode ? MOCK_CANDIDATES : (candData?.data ?? [])

  const create = useMutation({
    mutationFn: async (body: CreateCheckForm) => {
      // Validate company ID
      if (!companyId) {
        throw new Error('No company selected. Please select a company first.')
      }

      // In demo mode, simulate API call
      if (demoMode) {
        await new Promise(resolve => setTimeout(resolve, 800))
        return { data: { ...body, id: 'demo-new-check', status: 'pending' } }
      }

      const res = await fetch('/api/background-checks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          company_id: companyId,
          document_url: body.document_url || null,
          clearance_date: body.clearance_date || null,
          expiry_date: body.expiry_date || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      if (!demoMode) {
        qc.invalidateQueries({ queryKey: ['background-checks'] })
      }
      toast.success(demoMode ? 'Demo: Background check requested!' : 'Background check requested')
      reset()
      onClose()
    },
    onError: (err) => {
      toast.error('Failed to create check', err.message)
    },
  })

  return (
    <Modal open={open} onClose={onClose} title="Request Background Check" size="md">
      <form onSubmit={handleSubmit(v => create.mutateAsync(v))} className="space-y-4">
        {/* Subject type toggle */}
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Check For</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setSubjectType('candidate')
                setValue('employee_id', null)
              }}
              className={cn(
                'py-2 rounded-lg border text-sm font-medium transition-colors',
                subjectType === 'candidate'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-muted hover:border-accent/50'
              )}
            >
              Candidate
            </button>
            <button
              type="button"
              onClick={() => {
                setSubjectType('employee')
                setValue('candidate_id', null)
              }}
              className={cn(
                'py-2 rounded-lg border text-sm font-medium transition-colors',
                subjectType === 'employee'
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-muted hover:border-accent/50'
              )}
            >
              Employee
            </button>
          </div>
        </div>

        {/* Subject selection */}
        {subjectType === 'candidate' ? (
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Candidate *</label>
            <select className="input" {...register('candidate_id')}>
              <option value="">Select candidate...</option>
              {candidates.map((c: { id: string; full_name: string; email: string }) => (
                <option key={c.id} value={c.id}>{c.full_name} ({c.email})</option>
              ))}
            </select>
            {errors.candidate_id && <p className="text-xs text-danger mt-1">{errors.candidate_id.message}</p>}
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Employee *</label>
            <select className="input" {...register('employee_id')}>
              <option value="">Select employee...</option>
              {employees.map((e: { id: string; user?: { full_name: string }; employee_number: string }) => (
                <option key={e.id} value={e.id}>{e.user?.full_name} ({e.employee_number})</option>
              ))}
            </select>
            {errors.employee_id && <p className="text-xs text-danger mt-1">{errors.employee_id.message}</p>}
          </div>
        )}

        {/* Check type */}
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Check Type *</label>
          <select className="input" {...register('check_type')}>
            {Object.entries(CHECK_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </div>

        {/* Optional: Document URL for immediate upload */}
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Document URL (optional)</label>
          <input className="input" placeholder="https://..." {...register('document_url')} />
          <p className="text-xs text-text-muted mt-1">If you have the PCC/document already, provide the URL</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Clearance Date</label>
            <input type="date" className="input" {...register('clearance_date')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Expiry Date</label>
            <input type="date" className="input" {...register('expiry_date')} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Notes</label>
          <textarea className="input resize-none" rows={2} {...register('notes')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Request Check
          </button>
        </div>
      </form>
    </Modal>
  )
}

function ReviewCheckModal({
  open, check, onClose,
}: {
  open: boolean
  check: BackgroundCheckWithSubject | null
  onClose: () => void
}) {
  const qc = useQueryClient()
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ReviewCheckForm>({
    resolver: zodResolver(reviewCheckSchema),
    defaultValues: {
      status: 'passed',
      clearance_date: new Date().toISOString().slice(0, 10),
    },
  })

  const review = useMutation({
    mutationFn: async (body: ReviewCheckForm) => {
      const res = await fetch(`/api/background-checks/${check?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...body,
          expiry_date: body.expiry_date || null,
          flags: body.flags ? body.flags.split(',').map(f => f.trim()) : [],
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['background-checks'] })
      toast.success('Background check reviewed')
      onClose()
    },
    onError: (err) => {
      toast.error('Failed to review check', err.message)
    },
  })

  if (!check) return null

  const subjectName = check.employee?.user?.full_name ?? check.candidate?.full_name ?? 'Unknown'

  return (
    <Modal open={open} onClose={onClose} title="Review Background Check" size="md">
      <div className="mb-4 p-3 bg-surface-alt rounded-lg">
        <p className="text-sm font-medium">{subjectName}</p>
        <p className="text-xs text-text-muted">{CHECK_TYPE_LABELS[check.check_type]}</p>
      </div>

      <form onSubmit={handleSubmit(v => review.mutateAsync(v))} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Result *</label>
          <select className="input" {...register('status')}>
            <option value="passed">Passed - Cleared</option>
            <option value="flagged">Flagged - Passed with Concerns</option>
            <option value="failed">Failed - Disqualifying Issues</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Result Summary *</label>
          <textarea className="input resize-none" rows={2} placeholder="Summarize the findings..." {...register('result_summary')} />
          {errors.result_summary && <p className="text-xs text-danger mt-1">{errors.result_summary.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Clearance Date *</label>
            <input type="date" className="input" {...register('clearance_date')} />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-body mb-1.5">Expiry Date</label>
            <input type="date" className="input" {...register('expiry_date')} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Flags (comma-separated)</label>
          <input className="input" placeholder="e.g. minor_offense, requires_follow_up" {...register('flags')} />
          <p className="text-xs text-text-muted mt-1">Any concerns or notes to flag</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-body mb-1.5">Additional Notes</label>
          <textarea className="input resize-none" rows={2} {...register('notes')} />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button type="submit" disabled={isSubmitting} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Complete Review
          </button>
        </div>
      </form>
    </Modal>
  )
}

function CheckRow({
  check, onReview,
}: {
  check: BackgroundCheckWithSubject
  onReview: () => void
}) {
  const config = STATUS_CONFIG[check.status]
  const StatusIcon = config.icon
  const isExp = check.expiry_date ? isExpired(check.expiry_date) : false
  const isSoon = check.expiry_date ? isExpiringSoon(check.expiry_date, 30) && !isExp : false

  const subjectName = check.employee?.user?.full_name ?? check.candidate?.full_name ?? 'Unknown'
  const subjectEmail = check.employee?.user?.email ?? check.candidate?.email ?? ''
  const subjectType = check.employee_id ? 'Employee' : 'Candidate'

  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Avatar name={subjectName} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-text-primary">{subjectName}</p>
          <span className="text-xs px-1.5 py-0.5 rounded bg-surface-alt text-text-muted">{subjectType}</span>
        </div>
        <p className="text-xs text-text-muted">{CHECK_TYPE_LABELS[check.check_type]} · Requested {formatDate(check.requested_at)}</p>
        {check.flags && check.flags.length > 0 && (
          <p className="text-xs text-amber-600 mt-0.5">Flags: {check.flags.join(', ')}</p>
        )}
        {check.expiry_date && (
          <p className={cn('text-xs mt-0.5', isExp ? 'text-red-600 font-medium' : isSoon ? 'text-amber-600 font-medium' : 'text-text-muted')}>
            {isExp ? 'Expired' : 'Expires'}: {formatDate(check.expiry_date)}
          </p>
        )}
      </div>

      {/* Status badge */}
      <div className={cn('flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', config.bg, config.color)}>
        <StatusIcon className="w-3.5 h-3.5" />
        <span className="capitalize">{check.status.replace('_', ' ')}</span>
      </div>

      {/* Expiry warning */}
      {isExp && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
      {isSoon && <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />}

      {/* Review button for pending/in_progress/completed checks */}
      {['pending', 'in_progress', 'completed'].includes(check.status) && (
        <button
          onClick={onReview}
          className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          Review
        </button>
      )}
    </div>
  )
}

export function BackgroundChecksClient() {
  const activeCompanyId = useStore(s => s.activeCompanyId)
  const [addModal, setAddModal] = useState(false)
  const [reviewCheck, setReviewCheck] = useState<BackgroundCheckWithSubject | null>(null)
  const [statusFilter, setStatusFilter] = useState<BackgroundCheckStatus | ''>('')

  // Tutorial state
  const { isActive: tutorialActive, startTutorial } = useTutorialState()
  const isDemoMode = useDemoMode()

  // Refs for tutorial targeting
  const statsRef = useRef<HTMLDivElement>(null)
  const alertsRef = useRef<HTMLDivElement>(null)
  const tableRef = useRef<HTMLDivElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)

  const tutorialRefs: TutorialRefs = {
    stats: statsRef,
    alerts: alertsRef,
    table: tableRef,
    addButton: addButtonRef,
    filter: filterRef,
  }

  const { data, isLoading } = useQuery({
    queryKey: ['background-checks', activeCompanyId, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (activeCompanyId) params.set('companyId', activeCompanyId)
      if (statusFilter) params.set('status', statusFilter)
      params.set('pageSize', '100')
      const res = await fetch(`/api/background-checks?${params.toString()}`)
      if (!res.ok) return { data: [] }
      return res.json() as Promise<{ data: BackgroundCheckWithSubject[] }>
    },
    staleTime: 60 * 1000,
    enabled: !isDemoMode, // Skip real fetch in demo mode
  })

  // Use mock data in demo mode
  const checks = isDemoMode ? MOCK_BACKGROUND_CHECKS : (data?.data ?? [])
  const pending = checks.filter(c => c.status === 'pending').length
  const inProgress = checks.filter(c => c.status === 'in_progress').length
  const passed = checks.filter(c => c.status === 'passed').length
  const failed = checks.filter(c => c.status === 'failed').length
  const flagged = checks.filter(c => c.status === 'flagged').length
  const expiring = checks.filter(c => c.expiry_date && isExpiringSoon(c.expiry_date, 30) && !isExpired(c.expiry_date)).length
  const expired = checks.filter(c => c.expiry_date && isExpired(c.expiry_date)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Background Checks</h1>
          <p className="text-sm text-text-muted mt-0.5">
            {isDemoMode ? 'Demo Mode' : `${checks.length} check${checks.length !== 1 ? 's' : ''} total`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={startTutorial}
            className="btn-ghost flex items-center gap-2 text-sm"
          >
            <HelpCircle className="w-4 h-4" />
            Learn How
          </button>
          <button
            ref={addButtonRef}
            onClick={() => {
              if (!activeCompanyId) {
                toast.error('Please select a company first', 'Use the company switcher in the header to select a company')
                return
              }
              setAddModal(true)
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Request Check
          </button>
        </div>
      </div>

      {/* Stats cards */}
      <div ref={statsRef} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { label: 'Pending', value: pending, icon: Clock, color: 'text-gray-600', bg: 'bg-gray-50' },
          { label: 'In Progress', value: inProgress, icon: FileSearch, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Passed', value: passed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Failed', value: failed, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Flagged', value: flagged, icon: Flag, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Expiring', value: expiring, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Expired', value: expired, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className={cn('rounded-lg p-3', bg)}>
            <div className="flex items-center gap-2">
              <Icon className={cn('w-4 h-4', color)} />
              <span className={cn('text-lg font-bold', color)}>{value}</span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {(expired > 0 || flagged > 0 || isDemoMode) && (
        <div ref={alertsRef} className="space-y-2">
          {expired > 0 && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className="text-sm text-red-800">
                <span className="font-semibold">{expired} background check{expired !== 1 ? 's' : ''} expired.</span> Renewal required.
              </p>
            </div>
          )}
          {flagged > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <Flag className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-semibold">{flagged} check{flagged !== 1 ? 's' : ''} flagged.</span> Review recommended before hiring.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filter */}
      <div ref={filterRef} className="flex items-center gap-3">
        <label className="text-sm text-text-muted">Filter by status:</label>
        <select
          className="input w-48"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as BackgroundCheckStatus | '')}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed (Awaiting Review)</option>
          <option value="passed">Passed</option>
          <option value="failed">Failed</option>
          <option value="flagged">Flagged</option>
        </select>
      </div>

      {/* Checks table */}
      <div ref={tableRef} className="card p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-text-primary">
            {isDemoMode ? 'Demo Background Checks' : 'All Background Checks'}
          </h3>
        </div>
        {isLoading ? (
          <SkeletonTable rows={6} />
        ) : checks.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16">
            <ShieldCheck className="w-12 h-12 text-border" />
            <p className="text-text-muted text-sm">No background checks yet.</p>
            <button
              onClick={() => {
                if (!activeCompanyId) {
                  toast.error('Please select a company first', 'Use the company switcher in the header to select a company')
                  return
                }
                setAddModal(true)
              }}
              className="btn-primary"
            >
              Request first check
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {checks.map((check) => (
              <CheckRow
                key={check.id}
                check={check}
                onReview={() => setReviewCheck(check)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddCheckModal
        open={addModal}
        companyId={activeCompanyId ?? ''}
        onClose={() => setAddModal(false)}
        demoMode={isDemoMode}
      />
      <ReviewCheckModal
        open={!!reviewCheck}
        check={reviewCheck}
        onClose={() => setReviewCheck(null)}
      />

      {/* Tutorial */}
      <BackgroundCheckTutorial refs={tutorialRefs} />
    </div>
  )
}
