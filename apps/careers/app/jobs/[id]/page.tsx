import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@hr/shared'
import { ArrowLeft, Briefcase, Clock, CheckCircle2, Star, Building2 } from 'lucide-react'
import { ShareButton } from './share-button'
import { ApplyForm } from './apply-form'

interface JobRow {
  id: string
  title: string
  department: string | null
  description: string
  required_keywords: string[]
  nice_to_have_keywords: string[]
  employment_type: string
  closing_date: string | null
}

const TYPE_LABELS: Record<string, string> = {
  white_collar: 'Professional',
  casual: 'Casual',
}

const TYPE_COLORS: Record<string, string> = {
  white_collar: 'bg-blue-50 text-blue-700 border-blue-200',
  casual:       'bg-amber-50 text-amber-700 border-amber-200',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
}

function daysUntil(iso: string | null) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createServerClient(true)
  const { data } = await supabase
    .from('job_postings')
    .select('title, department, description')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .eq('status', 'open')
    .single<Pick<JobRow, 'title' | 'department' | 'description'>>()
  if (!data) return { title: 'Position not found' }
  const dept = data.department ? ` · ${data.department}` : ''
  return {
    title: `${data.title}${dept} | Sheer Logic Job Centre`,
    description: data.description.replace(/\n/g, ' ').slice(0, 160),
  }
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient(true)

  const { data: job } = await supabase
    .from('job_postings')
    .select('id, title, department, description, required_keywords, nice_to_have_keywords, employment_type, closing_date')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .eq('status', 'open')
    .single<JobRow>()

  if (!job) notFound()

  const closing = formatDate(job.closing_date)
  const days = daysUntil(job.closing_date)
  const isUrgent = days !== null && days >= 0 && days <= 3
  const typeClass = TYPE_COLORS[job.employment_type] ?? 'bg-surface-alt text-text-muted border-border'
  const paragraphs = job.description.split('\n').filter(Boolean)

  return (
    <div className="space-y-8 pb-16">
      {/* Back */}
      <Link href="/jobs" className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors group">
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        Back to all jobs
      </Link>

      {/* Header */}
      <div className="card p-8 space-y-6">
        <div className="space-y-4">
          {/* Breadcrumb dept */}
          {job.department && (
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <Building2 className="w-3.5 h-3.5" />
              {job.department}
            </div>
          )}

          <h1 className="text-3xl font-extrabold text-text-primary leading-tight">{job.title}</h1>

          {/* Meta chips */}
          <div className="flex flex-wrap items-center gap-2.5">
            <span className={`text-xs font-semibold border px-3 py-1 rounded-full ${typeClass}`}>
              <Briefcase className="w-3 h-3 inline mr-1" />
              {TYPE_LABELS[job.employment_type] ?? job.employment_type}
            </span>
            {closing && (
              <span className={`flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full border ${isUrgent ? 'bg-red-50 text-red-600 border-red-200' : 'bg-surface-alt text-text-muted border-border'}`}>
                <Clock className="w-3 h-3" />
                {isUrgent ? `Closing soon — ${closing}` : `Closes ${closing}`}
              </span>
            )}
          </div>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-3 pt-2 border-t border-border">
          <a
            href="#apply"
            className="btn-primary px-8 py-3 text-base"
          >
            Apply for this position
          </a>
          <ShareButton title={job.title} />
        </div>
      </div>

      {/* Body grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Job description */}
        <div className="lg:col-span-2 card p-7 space-y-5">
          <h2 className="text-lg font-bold text-text-primary">Job Description</h2>
          <div className="space-y-4 text-sm text-text-body leading-relaxed">
            {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {job.required_keywords.length > 0 && (
            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                Required Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.required_keywords.map((k) => (
                  <span key={k} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {job.nice_to_have_keywords.length > 0 && (
            <div className="card p-5 space-y-3">
              <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" />
                Nice to Have
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {job.nice_to_have_keywords.map((k) => (
                  <span key={k} className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-medium">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* About Sheer Logic */}
          <div className="card p-5 space-y-3">
            <h3 className="text-sm font-bold text-text-primary">About Sheer Logic</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Sheer Logic Management Consultants is a global one-stop shop for all HR requirements —
              from Staffing and Executive Search to HR Outsourcing, Consulting and Training.
              Incorporated in 1997, we serve leading organisations across Kenya, Uganda and Rwanda.
            </p>
            <a
              href="https://sheerlogicltd.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:underline font-medium"
            >
              sheerlogicltd.com ↗
            </a>
          </div>

          {/* Contact */}
          <div className="card p-5 space-y-2 text-sm">
            <p className="font-bold text-text-primary">Questions about this role?</p>
            <p className="text-text-muted text-xs">
              Contact our recruitment team at{' '}
              <a href="mailto:careers@sheerlogicltd.com" className="text-accent hover:underline">
                careers@sheerlogicltd.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Apply form */}
      <ApplyForm jobId={job.id} jobTitle={job.title} />
    </div>
  )
}
