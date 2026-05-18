import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServerClient } from '@hr/shared'
import { ArrowLeft, Briefcase, Clock, CheckCircle2, Star, Share2 } from 'lucide-react'
import { ShareButton } from './share-button'

const TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  temporary: 'Temporary',
}

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createServerClient(true)
  const { data } = await supabase
    .from('job_postings')
    .select('title, description')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .eq('status', 'open')
    .single()

  if (!data) return { title: 'Job Not Found' }
  return {
    title: `${data.title} | Sheer Logic Careers`,
    description: data.description.slice(0, 160),
  }
}

export default async function JobDetailPage({ params }: { params: { id: string } }) {
  const supabase = createServerClient(true)

  const { data: job } = await supabase
    .from('job_postings')
    .select('id, title, department, description, required_keywords, nice_to_have_keywords, employment_type, closing_date, created_at')
    .eq('id', params.id)
    .eq('is_deleted', false)
    .eq('status', 'open')
    .single()

  if (!job) notFound()

  const closing = formatDate(job.closing_date)
  const paragraphs = job.description.split('\n').filter(Boolean)

  return (
    <div className="space-y-8">
      {/* Back */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-text-muted hover:text-accent transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All positions
      </Link>

      {/* Header card */}
      <div className="bg-surface border border-border rounded-2xl p-8 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-text-primary">{job.title}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-text-muted">
            {job.department && (
              <span className="bg-surface-alt px-3 py-1 rounded-full">{job.department}</span>
            )}
            <span className="flex items-center gap-1.5">
              <Briefcase className="w-4 h-4" />
              {TYPE_LABELS[job.employment_type] ?? job.employment_type}
            </span>
            {closing && (
              <span className="flex items-center gap-1.5 text-amber-600">
                <Clock className="w-4 h-4" /> Closes {closing}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href={`mailto:careers@sheerlogicltd.com?subject=Application: ${encodeURIComponent(job.title)}&body=I am applying for the ${encodeURIComponent(job.title)} position (Ref: ${job.id}).`}
            className="btn-primary inline-flex items-center gap-2"
          >
            Apply for this position
          </a>
          <ShareButton title={job.title} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Description */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-text-primary">About the role</h2>
            <div className="prose prose-sm max-w-none text-text-body space-y-3">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar — skills */}
        <div className="space-y-4">
          {job.required_keywords.length > 0 && (
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" /> Required skills
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
            <div className="bg-surface border border-border rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400" /> Nice to have
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

          <div className="bg-surface border border-border rounded-2xl p-5 space-y-2 text-sm">
            <h3 className="font-semibold text-text-primary">How to apply</h3>
            <p className="text-text-muted text-xs">
              Send your CV and a short cover note to{' '}
              <a href="mailto:careers@sheerlogicltd.com" className="text-accent underline underline-offset-2">
                careers@sheerlogicltd.com
              </a>{' '}
              with the subject line &quot;{job.title}&quot;.
            </p>
            <div className="pt-1">
              <ShareButton title={job.title} variant="ghost" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
