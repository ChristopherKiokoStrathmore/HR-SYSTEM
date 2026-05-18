'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Briefcase, Clock, ArrowRight, MapPin, SlidersHorizontal, X } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contract: 'Contract',
  internship: 'Internship',
  temporary: 'Temporary',
}

const TYPE_COLORS: Record<string, string> = {
  full_time:  'bg-blue-50 text-blue-700 border-blue-200',
  part_time:  'bg-purple-50 text-purple-700 border-purple-200',
  contract:   'bg-amber-50 text-amber-700 border-amber-200',
  internship: 'bg-green-50 text-green-700 border-green-200',
  temporary:  'bg-orange-50 text-orange-700 border-orange-200',
}

function daysUntil(iso: string | null) {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000)
}

function closingLabel(iso: string | null) {
  const d = daysUntil(iso)
  if (d === null || d < 0) return null
  if (d === 0) return 'Closes today'
  if (d === 1) return 'Closes tomorrow'
  if (d <= 7) return `${d} days left`
  return `Closes ${new Date(iso!).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`
}

export interface JobItem {
  id: string
  title: string
  department: string | null
  description: string
  required_keywords: string[]
  employment_type: string
  closing_date: string | null
}

interface Props {
  jobs: JobItem[]
}

export function JobsClient({ jobs }: Props) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const departments = useMemo(
    () => [...new Set(jobs.map((j) => j.department).filter(Boolean))] as string[],
    [jobs],
  )

  const types = useMemo(
    () => [...new Set(jobs.map((j) => j.employment_type))],
    [jobs],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return jobs.filter((j) => {
      const matchSearch =
        !q ||
        j.title.toLowerCase().includes(q) ||
        (j.department ?? '').toLowerCase().includes(q) ||
        j.required_keywords.some((k) => k.toLowerCase().includes(q))
      const matchType = !typeFilter || j.employment_type === typeFilter
      return matchSearch && matchType
    })
  }, [jobs, search, typeFilter])

  const grouped = useMemo(() => {
    if (search || typeFilter || departments.length <= 1) return null
    const map = new Map<string, JobItem[]>()
    const uncategorised: JobItem[] = []
    filtered.forEach((j) => {
      if (j.department) {
        if (!map.has(j.department)) map.set(j.department, [])
        map.get(j.department)!.push(j)
      } else {
        uncategorised.push(j)
      }
    })
    if (uncategorised.length) map.set('Other', uncategorised)
    return map
  }, [filtered, search, typeFilter, departments])

  const clearFilters = () => { setSearch(''); setTypeFilter('') }
  const hasFilters = search || typeFilter

  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="text-center space-y-5 py-12 px-4">
        {/* Badge */}
        <span className="inline-flex items-center gap-2 bg-accent/10 text-accent text-xs font-semibold px-4 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-accent" />
          Job Centre
        </span>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-text-primary tracking-tight leading-tight">
          Your Next Career<br />Opportunity Starts Here
        </h1>

        <p className="text-text-muted text-lg max-w-2xl mx-auto">
          Sheer Logic connects talented professionals with leading organisations
          across Kenya, Uganda and Rwanda. Browse our live vacancies below.
        </p>

        {/* Stats */}
        <div className="flex items-center justify-center gap-6 pt-2 text-sm">
          <div className="text-center">
            <p className="text-2xl font-bold text-accent">{jobs.length}</p>
            <p className="text-text-muted text-xs">Live vacancies</p>
          </div>
          {departments.length > 0 && (
            <>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">{departments.length}</p>
                <p className="text-text-muted text-xs">Departments</p>
              </div>
            </>
          )}
          {types.length > 0 && (
            <>
              <div className="w-px h-8 bg-border" />
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">{types.length}</p>
                <p className="text-text-muted text-xs">Job type{types.length !== 1 ? 's' : ''}</p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Search & Filter ──────────────────────────────────────────────── */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, department or skill…"
            className="input pl-10"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input pl-9 pr-8 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="">All types</option>
              {types.map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
              ))}
            </select>
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 text-sm text-text-muted hover:text-danger transition-colors whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Results ──────────────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-alt flex items-center justify-center mx-auto">
            <Briefcase className="w-8 h-8 text-text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">No matching positions</h2>
          <p className="text-text-muted text-sm">Try broadening your search or{' '}
            <button onClick={clearFilters} className="text-accent hover:underline">clear all filters</button>.
          </p>
        </div>
      ) : grouped ? (
        <div className="space-y-10">
          {[...grouped.entries()].map(([dept, deptJobs]) => (
            <section key={dept} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">{dept}</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-text-muted">{deptJobs.length} position{deptJobs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-3">
                {deptJobs.map((job) => <JobCard key={job.id} job={job} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {hasFilters && (
            <p className="text-sm text-text-muted mb-4">
              Showing <span className="font-semibold text-text-body">{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
              {search ? ` for "${search}"` : ''}
            </p>
          )}
          {filtered.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}
    </>
  )
}

function JobCard({ job }: { job: JobItem }) {
  const closing = closingLabel(job.closing_date)
  const days = daysUntil(job.closing_date)
  const isUrgent = days !== null && days >= 0 && days <= 3
  const snippet = job.description.replace(/\n/g, ' ').slice(0, 140)
  const typeClass = TYPE_COLORS[job.employment_type] ?? 'bg-surface-alt text-text-muted border-border'

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex items-start justify-between gap-4 card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex-1 min-w-0 space-y-2.5">
        {/* Title row */}
        <div className="flex items-start gap-2 flex-wrap">
          <h3 className="font-semibold text-text-primary group-hover:text-accent transition-colors">
            {job.title}
          </h3>
          {isUrgent && (
            <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-wide flex-shrink-0 mt-0.5">
              Closing soon
            </span>
          )}
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-3">
          {job.department && (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <MapPin className="w-3 h-3" /> {job.department}
            </span>
          )}
          <span className={`text-xs font-medium border px-2.5 py-0.5 rounded-full ${typeClass}`}>
            {TYPE_LABELS[job.employment_type] ?? job.employment_type}
          </span>
          {closing && (
            <span className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-red-500 font-medium' : 'text-text-muted'}`}>
              <Clock className="w-3 h-3" /> {closing}
            </span>
          )}
        </div>

        {/* Snippet */}
        <p className="text-sm text-text-muted line-clamp-2 leading-relaxed">{snippet}…</p>

        {/* Keywords */}
        {job.required_keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {job.required_keywords.slice(0, 5).map((k) => (
              <span key={k} className="text-xs bg-primary/5 text-primary px-2 py-0.5 rounded-full font-medium border border-primary/10">
                {k}
              </span>
            ))}
            {job.required_keywords.length > 5 && (
              <span className="text-xs text-text-muted self-center">+{job.required_keywords.length - 5} more</span>
            )}
          </div>
        )}
      </div>

      <div className="flex-shrink-0 flex flex-col items-end justify-between h-full gap-4 pt-0.5">
        <ArrowRight className="w-5 h-5 text-border group-hover:text-accent group-hover:translate-x-1 transition-all" />
        <span className="text-xs font-semibold text-accent border border-accent/30 rounded-lg px-3 py-1.5 group-hover:bg-accent group-hover:text-white transition-all whitespace-nowrap">
          View &amp; Apply
        </span>
      </div>
    </Link>
  )
}
