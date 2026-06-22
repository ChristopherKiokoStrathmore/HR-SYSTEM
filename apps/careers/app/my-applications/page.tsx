import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import Link from 'next/link'
import { getDb } from '@/lib/db.server'
import { ArrowLeft, Briefcase, Clock, CheckCircle2, XCircle, ClipboardList } from 'lucide-react'

export const metadata: Metadata = { title: 'My Applications | Sheer Logic Job Centre' }

const STAGE_LABELS: Record<string, string> = {
  applied:      'Applied',
  screened:     'Under Review',
  interview_l1: 'First Interview',
  interview_l2: 'Final Interview',
  offer_sent:   'Offer Extended',
  hired:        'Hired',
  rejected:     'Unsuccessful',
}

const STAGE_COLORS: Record<string, string> = {
  applied:      'bg-blue-50 text-blue-700 border-blue-200',
  screened:     'bg-amber-50 text-amber-700 border-amber-200',
  interview_l1: 'bg-purple-50 text-purple-700 border-purple-200',
  interview_l2: 'bg-purple-50 text-purple-700 border-purple-200',
  offer_sent:   'bg-green-50 text-green-700 border-green-200',
  hired:        'bg-green-50 text-green-700 border-green-200',
  rejected:     'bg-red-50 text-red-600 border-red-200',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default async function MyApplicationsPage() {
  const jar = cookies()
  const raw = jar.get('sl_applications')?.value
  const tokens: string[] = raw ? JSON.parse(raw) : []

  let applications: Array<{
    tracking_token: string
    full_name: string
    email: string
    current_stage: string
    created_at: string
    job_title: string | null
    job_department: string | null
  }> = []

  if (tokens.length > 0) {
    try {
      const sql = getDb()
      const rows = await sql`
        SELECT
          c.tracking_token,
          c.full_name,
          c.email,
          c.current_stage,
          c.created_at,
          jp.title       AS job_title,
          jp.department  AS job_department
        FROM candidates c
        LEFT JOIN job_postings jp ON jp.id = c.job_posting_id
        WHERE c.tracking_token = ANY(${tokens})
        ORDER BY c.created_at DESC
      `
      applications = rows as unknown as typeof applications
    } catch { /* DB error — show empty state */ }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-20 px-4 pt-8">
      {/* Back */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Browse all positions
      </Link>

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-accent" />
          <h1 className="text-2xl font-extrabold text-text-primary">My Applications</h1>
          {applications.length > 0 && (
            <span className="ml-auto text-xs font-bold bg-accent/10 text-accent px-2.5 py-1 rounded-full">
              {applications.length} {applications.length === 1 ? 'application' : 'applications'}
            </span>
          )}
        </div>
        <p className="text-sm text-text-muted">
          Track all your Sheer Logic job applications in one place.
        </p>
      </div>

      {applications.length === 0 ? (
        <div className="card p-10 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-surface-alt flex items-center justify-center mx-auto">
            <ClipboardList className="w-7 h-7 text-text-muted" />
          </div>
          <h2 className="font-bold text-text-primary">No applications yet</h2>
          <p className="text-sm text-text-muted max-w-sm mx-auto">
            When you apply for a position, your applications will appear here automatically.
            Applications are remembered on this device.
          </p>
          <Link href="/jobs" className="btn-primary px-6 py-2.5 inline-flex items-center gap-2 text-sm mt-2">
            <Briefcase className="w-4 h-4" />
            Browse open positions
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => {
            const isHired    = app.current_stage === 'hired'
            const isRejected = app.current_stage === 'rejected'
            const stageLabel = STAGE_LABELS[app.current_stage] ?? app.current_stage
            const stageColor = STAGE_COLORS[app.current_stage] ?? 'bg-surface-alt text-text-muted border-border'

            return (
              <Link
                key={app.tracking_token}
                href={`/track/${app.tracking_token}`}
                className="card p-5 flex items-start gap-4 hover:shadow-md transition-shadow group"
              >
                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  isHired ? 'bg-green-100' : isRejected ? 'bg-red-50' : 'bg-accent/10'
                }`}>
                  {isHired
                    ? <CheckCircle2 className="w-5 h-5 text-green-600" />
                    : isRejected
                    ? <XCircle className="w-5 h-5 text-red-500" />
                    : <Briefcase className="w-5 h-5 text-accent" />}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-text-primary truncate group-hover:text-accent transition-colors">
                    {app.job_title ?? 'Position'}
                  </p>
                  {app.job_department && (
                    <p className="text-xs text-text-muted mt-0.5">{app.job_department}</p>
                  )}
                  <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Applied {formatDate(app.created_at)}
                  </p>
                </div>

                {/* Status badge */}
                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border flex-shrink-0 ${stageColor}`}>
                  {stageLabel}
                </span>
              </Link>
            )
          })}
        </div>
      )}

      <p className="text-xs text-text-muted text-center">
        Applications are tracked on this device. To access from another device, use the link in your confirmation email.
      </p>
    </div>
  )
}
