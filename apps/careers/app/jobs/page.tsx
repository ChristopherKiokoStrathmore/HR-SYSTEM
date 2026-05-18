import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerClient } from '@hr/shared'
import { Briefcase, Clock, ArrowRight, MapPin } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Open Positions',
  description: 'Explore open roles at Sheer Logic Management Consultants.',
}

const TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  temporary: 'Temporary',
}

function formatClosing(iso: string | null) {
  if (!iso) return null
  const d = new Date(iso)
  const now = new Date()
  const days = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (days < 0) return null
  if (days === 0) return 'Closes today'
  if (days === 1) return 'Closes tomorrow'
  if (days <= 7) return `Closes in ${days} days`
  return `Closes ${d.toLocaleDateString('en-KE', { day: 'numeric', month: 'long' })}`
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
    <div className="space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4 py-10">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-xs font-semibold px-3 py-1.5 rounded-full mb-2">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
          We&apos;re hiring
        </div>
        <h1 className="text-4xl font-bold text-text-primary tracking-tight">
          Build the future of HR<br />with us
        </h1>
        <p className="text-text-muted max-w-lg mx-auto text-lg">
          Join a team shaping people management across East Africa.
          Remote-friendly. Mission-driven.
        </p>
        {jobs.length > 0 && (
          <p className="text-sm text-text-muted">
            <span className="font-semibold text-accent">{jobs.length}</span> open position{jobs.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {/* Listings */}
      {jobs.length === 0 ? (
        <div className="text-center py-24 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-alt flex items-center justify-center mx-auto">
            <Briefcase className="w-8 h-8 text-text-muted" />
          </div>
          <h2 className="text-xl font-semibold text-text-primary">No open positions right now</h2>
          <p className="text-text-muted">We&apos;re not actively hiring at the moment — check back soon.</p>
          <a
            href="mailto:careers@sheerlogicltd.com"
            className="inline-block mt-4 text-sm text-accent hover:underline"
          >
            Send us your CV anyway →
          </a>
        </div>
      ) : departments.length > 1 ? (
        <div className="space-y-10">
          {departments.map((dept) => (
            <section key={dept} className="space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest">{dept}</h2>
                <div className="flex-1 h-px bg-border" />
              </div>
              {jobs.filter((j) => j.department === dept).map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {jobs.map((job) => <JobCard key={job.id} job={job} />)}
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
  const closing = formatClosing(job.closing_date)
  const snippet = job.description.replace(/\n/g, ' ').slice(0, 150)
  const isUrgent = (() => {
    if (!job.closing_date) return false
    const days = Math.ceil((new Date(job.closing_date).getTime() - Date.now()) / 86400000)
    return days >= 0 && days <= 3
  })()

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block card p-6 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-text-primary group-hover:text-accent transition-colors">
              {job.title}
            </h3>
            {isUrgent && (
              <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wide">
                Closing soon
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-text-muted">
            {job.department && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {job.department}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Briefcase className="w-3 h-3" /> {TYPE_LABELS[job.employment_type] ?? job.employment_type}
            </span>
            {closing && (
              <span className={`flex items-center gap-1 ${isUrgent ? 'text-red-500 font-medium' : ''}`}>
                <Clock className="w-3 h-3" /> {closing}
              </span>
            )}
          </div>

          <p className="text-sm text-text-muted line-clamp-2">{snippet}…</p>

          {job.required_keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {job.required_keywords.slice(0, 5).map((k) => (
                <span key={k} className="text-xs bg-accent/10 text-accent px-2 py-0.5 rounded-full font-medium">{k}</span>
              ))}
              {job.required_keywords.length > 5 && (
                <span className="text-xs text-text-muted self-center">+{job.required_keywords.length - 5}</span>
              )}
            </div>
          )}
        </div>

        <ArrowRight className="w-5 h-5 text-border group-hover:text-accent group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
      </div>
    </Link>
  )
}
