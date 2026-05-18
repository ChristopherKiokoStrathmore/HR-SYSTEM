import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@hr/shared'
import { Briefcase, MapPin, Clock, ArrowRight } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Open Positions | Sheer Logic',
  description: 'Explore open roles at Sheer Logic Management Consultants.',
}

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

export default async function JobsPage() {
  const supabase = createServerClient(true)

  const { data: postings } = await supabase
    .from('job_postings')
    .select('id, title, department, description, required_keywords, employment_type, closing_date, created_at')
    .eq('is_deleted', false)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  const jobs = postings ?? []

  const departments = [...new Set(jobs.map((j) => j.department).filter(Boolean))] as string[]

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="text-center space-y-3 py-8">
        <h1 className="text-3xl font-bold text-text-primary">Open Positions</h1>
        <p className="text-text-muted max-w-xl mx-auto">
          Join a team that&apos;s shaping the future of HR and people management across East Africa.
        </p>
        {jobs.length > 0 && (
          <p className="text-sm text-accent font-medium">{jobs.length} open role{jobs.length !== 1 ? 's' : ''}</p>
        )}
      </div>

      {jobs.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Briefcase className="w-12 h-12 text-border mx-auto" />
          <h2 className="text-lg font-semibold text-text-primary">No open positions right now</h2>
          <p className="text-text-muted text-sm">Check back soon — we&apos;re growing fast.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Group by department if multiple departments */}
          {departments.length > 1 ? (
            departments.map((dept) => (
              <section key={dept} className="space-y-3">
                <h2 className="text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border pb-2">
                  {dept}
                </h2>
                <div className="space-y-3">
                  {jobs.filter((j) => j.department === dept).map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function JobCard({ job }: {
  job: {
    id: string
    title: string
    department: string | null
    description: string
    required_keywords: string[]
    employment_type: string
    closing_date: string | null
  }
}) {
  const closing = formatDate(job.closing_date)
  const snippet = job.description.replace(/\n/g, ' ').slice(0, 160)

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block bg-surface border border-border rounded-2xl p-5 hover:border-accent hover:shadow-md transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          <h3 className="font-semibold text-text-primary group-hover:text-accent transition-colors">
            {job.title}
          </h3>
          <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            {job.department && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {job.department}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> {TYPE_LABELS[job.employment_type] ?? job.employment_type}
            </span>
            {closing && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Closes {closing}
              </span>
            )}
          </div>
          <p className="text-sm text-text-muted line-clamp-2">{snippet}…</p>
          {job.required_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {job.required_keywords.slice(0, 6).map((k) => (
                <span key={k} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full">{k}</span>
              ))}
              {job.required_keywords.length > 6 && (
                <span className="text-xs text-text-muted">+{job.required_keywords.length - 6} more</span>
              )}
            </div>
          )}
        </div>
        <ArrowRight className="w-5 h-5 text-border group-hover:text-accent group-hover:translate-x-1 transition-all flex-shrink-0 mt-0.5" />
      </div>
    </Link>
  )
}
