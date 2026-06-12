'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Search, Briefcase, Clock, ArrowRight, MapPin, SlidersHorizontal, X,
  Bell, ChevronDown, ChevronUp, Navigation, Loader2, Calendar, Layers,
} from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  white_collar: 'Professional',
  casual: 'Casual',
}

const TYPE_COLORS: Record<string, string> = {
  white_collar: 'bg-blue-50 text-blue-700 border-blue-200',
  casual:       'bg-amber-50 text-amber-700 border-amber-200',
}

const EXP_LABELS: Record<string, string> = {
  entry:     'Entry Level',
  mid:       'Mid Level',
  senior:    'Senior',
  executive: 'Executive',
}

const DATE_OPTIONS = [
  { value: 'any',   label: 'Any time' },
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This week' },
  { value: 'month', label: 'This month' },
] as const

const RADIUS_OPTIONS = [10, 25, 50, 100, 200]

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const r = (d: number) => (d * Math.PI) / 180
  const dLat = r(lat2 - lat1)
  const dLng = r(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
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
  created_at: string
  location_name: string | null
  location_lat: number | null
  location_lng: number | null
  experience_level: string | null
}

interface LocationCoords { lat: number; lng: number }

interface AdvancedState {
  locationInput: string
  locationCoords: LocationCoords | null
  locationResolved: string
  radius: number
  categories: string[]
  datePosted: 'any' | 'today' | 'week' | 'month'
  experienceLevels: string[]
}

const DEFAULT_ADV: AdvancedState = {
  locationInput: '',
  locationCoords: null,
  locationResolved: '',
  radius: 50,
  categories: [],
  datePosted: 'any',
  experienceLevels: [],
}

interface Props { jobs: JobItem[] }

export function JobsClient({ jobs }: Props) {
  const [search, setSearch]         = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [adv, setAdv]               = useState<AdvancedState>(DEFAULT_ADV)
  const [panelOpen, setPanelOpen]   = useState(false)
  const [geocoding, setGeocoding]   = useState(false)
  const [geoError, setGeoError]     = useState('')
  const [alertOpen, setAlertOpen]   = useState(false)
  const locationRef                 = useRef<HTMLInputElement>(null)

  const departments = useMemo(
    () => Array.from(new Set(jobs.map((j) => j.department).filter(Boolean))) as string[],
    [jobs],
  )
  const types = useMemo(() => Array.from(new Set(jobs.map((j) => j.employment_type))), [jobs])

  // ── Geocode location input via Nominatim ─────────────────────────────────
  const geocodeLocation = useCallback(async () => {
    const q = adv.locationInput.trim()
    if (!q) return
    setGeocoding(true)
    setGeoError('')
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&countrycodes=ke,ug,rw`
      const res = await fetch(url, { headers: { 'User-Agent': 'SheerLogicJobBoard/1.0' } })
      const data: { lat: string; lon: string; display_name: string }[] = await res.json()
      if (!data[0]) { setGeoError('Location not found. Try a city name like "Nairobi" or "Mombasa".'); return }
      const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
      const short = data[0].display_name.split(',').slice(0, 2).join(',')
      setAdv((prev) => ({ ...prev, locationCoords: coords, locationResolved: short }))
    } catch {
      setGeoError('Could not reach geocoding service. Check your connection.')
    } finally {
      setGeocoding(false)
    }
  }, [adv.locationInput])

  // ── GPS "use my location" ─────────────────────────────────────────────────
  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) return
    setGeocoding(true)
    setGeoError('')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setAdv((prev) => ({
          ...prev,
          locationCoords: coords,
          locationInput: 'My location',
          locationResolved: 'Your location',
        }))
        setGeocoding(false)
      },
      () => { setGeoError('Location permission denied.'); setGeocoding(false) },
    )
  }, [])

  // ── Toggle helpers ────────────────────────────────────────────────────────
  const toggleCategory = (cat: string) =>
    setAdv((p) => ({
      ...p,
      categories: p.categories.includes(cat) ? p.categories.filter((c) => c !== cat) : [...p.categories, cat],
    }))

  const toggleExp = (exp: string) =>
    setAdv((p) => ({
      ...p,
      experienceLevels: p.experienceLevels.includes(exp) ? p.experienceLevels.filter((e) => e !== exp) : [...p.experienceLevels, exp],
    }))

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const now = Date.now()
    return jobs.filter((j) => {
      if (!q && false) return true // placeholder keeps linter happy
      const matchSearch =
        !q ||
        j.title.toLowerCase().includes(q) ||
        (j.department ?? '').toLowerCase().includes(q) ||
        j.required_keywords.some((k) => k.toLowerCase().includes(q))

      const matchType = !typeFilter || j.employment_type === typeFilter

      const matchCat = adv.categories.length === 0 || adv.categories.includes(j.department ?? '')

      const matchDate = (() => {
        if (adv.datePosted === 'any') return true
        const created = new Date(j.created_at).getTime()
        if (adv.datePosted === 'today') return created >= now - 86_400_000
        if (adv.datePosted === 'week')  return created >= now - 7 * 86_400_000
        if (adv.datePosted === 'month') return created >= now - 30 * 86_400_000
        return true
      })()

      const matchExp =
        adv.experienceLevels.length === 0 || adv.experienceLevels.includes(j.experience_level ?? '')

      const matchLoc = (() => {
        if (!adv.locationCoords || j.location_lat == null || j.location_lng == null) return true
        return haversineKm(adv.locationCoords.lat, adv.locationCoords.lng, j.location_lat, j.location_lng) <= adv.radius
      })()

      return matchSearch && matchType && matchCat && matchDate && matchExp && matchLoc
    })
  }, [jobs, search, typeFilter, adv])

  const grouped = useMemo(() => {
    if (search || typeFilter || adv.categories.length || adv.experienceLevels.length || adv.locationCoords || adv.datePosted !== 'any' || departments.length <= 1)
      return null
    const map = new Map<string, JobItem[]>()
    const other: JobItem[] = []
    filtered.forEach((j) => {
      if (j.department) {
        if (!map.has(j.department)) map.set(j.department, [])
        map.get(j.department)!.push(j)
      } else { other.push(j) }
    })
    if (other.length) map.set('Other', other)
    return map
  }, [filtered, search, typeFilter, adv, departments])

  // ── Active filter chips ───────────────────────────────────────────────────
  const hasAdv = adv.locationCoords || adv.categories.length || adv.experienceLevels.length || adv.datePosted !== 'any'
  const hasAny = search || typeFilter || hasAdv

  const clearAll = () => { setSearch(''); setTypeFilter(''); setAdv(DEFAULT_ADV) }

  // Build active chip list for display
  const chips: { label: string; clear: () => void }[] = []
  if (adv.locationCoords)
    chips.push({ label: `📍 ${adv.locationResolved} · ${adv.radius} km`, clear: () => setAdv((p) => ({ ...p, locationCoords: null, locationResolved: '', locationInput: '' })) })
  adv.categories.forEach((c) => chips.push({ label: c, clear: () => toggleCategory(c) }))
  adv.experienceLevels.forEach((e) => chips.push({ label: EXP_LABELS[e] ?? e, clear: () => toggleExp(e) }))
  if (adv.datePosted !== 'any')
    chips.push({ label: DATE_OPTIONS.find((d) => d.value === adv.datePosted)?.label ?? adv.datePosted, clear: () => setAdv((p) => ({ ...p, datePosted: 'any' })) })

  const advFilterCount = chips.length + (typeFilter ? 1 : 0)

  return (
    <>
      {/* ── Hero ── */}
      <section className="text-center space-y-5 py-12 px-4">
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

      {/* ── Search bar row ── */}
      <div className="card p-4 space-y-3 mb-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Keyword */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Job title, skill or keyword…"
              className="input pl-10"
            />
          </div>

          {/* Job type */}
          <div className="relative">
            <SlidersHorizontal className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="input pl-9 pr-8 appearance-none cursor-pointer min-w-[150px]"
            >
              <option value="">All types</option>
              {types.map((t) => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
            </select>
          </div>

          {/* Advanced toggle */}
          <button
            onClick={() => setPanelOpen((o) => !o)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors whitespace-nowrap ${panelOpen ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent hover:text-accent'}`}
          >
            <Layers className="w-4 h-4" />
            Filters
            {advFilterCount > 0 && (
              <span className={`text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center ${panelOpen ? 'bg-white text-accent' : 'bg-accent text-white'}`}>
                {advFilterCount}
              </span>
            )}
            {panelOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {/* Alert button */}
          <button
            onClick={() => setAlertOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-accent/40 text-accent text-sm font-medium hover:bg-accent hover:text-white transition-colors whitespace-nowrap"
          >
            <Bell className="w-4 h-4" />
            Job alerts
          </button>
        </div>

        {/* ── Advanced filter panel ── */}
        {panelOpen && (
          <div className="border-t border-border pt-4 space-y-5">

            {/* Location + radius */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" /> Location
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    ref={locationRef}
                    type="text"
                    value={adv.locationInput}
                    onChange={(e) => setAdv((p) => ({ ...p, locationInput: e.target.value, locationCoords: null, locationResolved: '' }))}
                    onKeyDown={(e) => e.key === 'Enter' && geocodeLocation()}
                    placeholder="City or area (e.g. Nairobi, Mombasa)"
                    className="input pr-10"
                  />
                  {adv.locationCoords && (
                    <button
                      onClick={() => setAdv((p) => ({ ...p, locationInput: '', locationCoords: null, locationResolved: '' }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-danger"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={geocodeLocation}
                  disabled={geocoding || !adv.locationInput.trim()}
                  className="btn-primary px-4 py-2 text-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {geocoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  Search
                </button>
                <button
                  onClick={useMyLocation}
                  disabled={geocoding}
                  title="Use my location"
                  className="p-2.5 rounded-lg border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-50"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </div>
              {geoError && <p className="text-xs text-red-500">{geoError}</p>}
              {adv.locationResolved && (
                <p className="text-xs text-green-600 font-medium">Searching near: {adv.locationResolved}</p>
              )}

              {/* Radius */}
              <div className="flex items-center gap-2 flex-wrap pt-1">
                <span className="text-xs text-text-muted">Within:</span>
                {RADIUS_OPTIONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setAdv((p) => ({ ...p, radius: r }))}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors ${adv.radius === r ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent hover:text-accent'}`}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            {departments.length > 0 && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                  <Briefcase className="w-3.5 h-3.5" /> Category
                </label>
                <div className="flex flex-wrap gap-2">
                  {departments.map((dept) => (
                    <button
                      key={dept}
                      onClick={() => toggleCategory(dept)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${adv.categories.includes(dept) ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent hover:text-accent'}`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Date posted */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-widest flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5" /> Date Posted
              </label>
              <div className="flex flex-wrap gap-2">
                {DATE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setAdv((p) => ({ ...p, datePosted: opt.value as AdvancedState['datePosted'] }))}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${adv.datePosted === opt.value ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent hover:text-accent'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Experience level */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-muted uppercase tracking-widest">Experience Level</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(EXP_LABELS).map(([val, label]) => (
                  <button
                    key={val}
                    onClick={() => toggleExp(val)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${adv.experienceLevels.includes(val) ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent hover:text-accent'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button onClick={clearAll} className="text-xs text-text-muted hover:text-danger transition-colors flex items-center gap-1">
                <X className="w-3.5 h-3.5" /> Clear all filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Active filter chips ── */}
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {chips.map((chip) => (
            <span key={chip.label} className="flex items-center gap-1.5 text-xs bg-accent/10 text-accent border border-accent/20 px-3 py-1 rounded-full font-medium">
              {chip.label}
              <button onClick={chip.clear} className="hover:text-red-500 transition-colors"><X className="w-3 h-3" /></button>
            </span>
          ))}
          <button onClick={clearAll} className="text-xs text-text-muted hover:text-danger transition-colors underline">Clear all</button>
        </div>
      )}

      {/* ── Results ── */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-surface-alt flex items-center justify-center mx-auto">
            <Briefcase className="w-8 h-8 text-text-muted" />
          </div>
          <h2 className="text-lg font-semibold text-text-primary">No matching positions</h2>
          <p className="text-text-muted text-sm">
            Try broadening your search or{' '}
            <button onClick={clearAll} className="text-accent hover:underline">clear all filters</button>.
          </p>
        </div>
      ) : grouped ? (
        <div className="space-y-10">
          {Array.from(grouped.entries()).map(([dept, deptJobs]) => (
            <section key={dept} className="space-y-3">
              <div className="flex items-center gap-3">
                <h2 className="text-xs font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">{dept}</h2>
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-text-muted">{deptJobs.length} position{deptJobs.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="space-y-3">
                {deptJobs.map((job: JobItem) => <JobCard key={job.id} job={job} />)}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {hasAny && (
            <p className="text-sm text-text-muted mb-4">
              Showing <span className="font-semibold text-text-body">{filtered.length}</span> result{filtered.length !== 1 ? 's' : ''}
              {search ? ` for "${search}"` : ''}
            </p>
          )}
          {filtered.map((job) => <JobCard key={job.id} job={job} />)}
        </div>
      )}

      {/* ── Job alert CTA banner ── */}
      <div className="mt-16 card p-7 text-center space-y-3 bg-gradient-to-br from-primary/5 to-accent/5 border-accent/20">
        <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
          <Bell className="w-6 h-6 text-accent" />
        </div>
        <h3 className="font-bold text-text-primary text-lg">Don't miss your perfect role</h3>
        <p className="text-sm text-text-muted max-w-md mx-auto">
          Set up a personalised job alert and we'll notify you by email (and SMS if you choose)
          the moment a matching position opens.
        </p>
        <button onClick={() => setAlertOpen(true)} className="btn-primary px-8 py-3 text-base mt-2 inline-flex items-center gap-2">
          <Bell className="w-4 h-4" /> Create job alert
        </button>
      </div>

      {/* ── Alert modal ── */}
      {alertOpen && (
        <JobAlertModal
          onClose={() => setAlertOpen(false)}
          initialSearch={search}
          initialType={typeFilter}
          initialCategories={adv.categories}
          initialExperience={adv.experienceLevels}
          initialLocation={adv.locationResolved}
          initialLocationCoords={adv.locationCoords}
          initialRadius={adv.radius}
        />
      )}
    </>
  )
}

// ── JobCard ──────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: JobItem }) {
  const closing   = closingLabel(job.closing_date)
  const days      = daysUntil(job.closing_date)
  const isUrgent  = days !== null && days >= 0 && days <= 3
  const snippet   = job.description.replace(/\n/g, ' ').slice(0, 140)
  const typeClass = TYPE_COLORS[job.employment_type] ?? 'bg-surface-alt text-text-muted border-border'

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex items-start justify-between gap-4 card p-5 hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200"
    >
      <div className="flex-1 min-w-0 space-y-2.5">
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

        <div className="flex flex-wrap items-center gap-3">
          {job.location_name ? (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <MapPin className="w-3 h-3" /> {job.location_name}
            </span>
          ) : job.department ? (
            <span className="flex items-center gap-1 text-xs text-text-muted">
              <MapPin className="w-3 h-3" /> {job.department}
            </span>
          ) : null}
          <span className={`text-xs font-medium border px-2.5 py-0.5 rounded-full ${typeClass}`}>
            {TYPE_LABELS[job.employment_type] ?? job.employment_type}
          </span>
          {job.experience_level && (
            <span className="text-xs text-text-muted bg-surface-alt border border-border px-2.5 py-0.5 rounded-full">
              {EXP_LABELS[job.experience_level] ?? job.experience_level}
            </span>
          )}
          {closing && (
            <span className={`flex items-center gap-1 text-xs ${isUrgent ? 'text-red-500 font-medium' : 'text-text-muted'}`}>
              <Clock className="w-3 h-3" /> {closing}
            </span>
          )}
        </div>

        <p className="text-sm text-text-muted line-clamp-2 leading-relaxed">{snippet}…</p>

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

// ── JobAlertModal ─────────────────────────────────────────────────────────────

interface AlertModalProps {
  onClose: () => void
  initialSearch: string
  initialType: string
  initialCategories: string[]
  initialExperience: string[]
  initialLocation: string
  initialLocationCoords: LocationCoords | null
  initialRadius: number
}

function JobAlertModal({
  onClose, initialSearch, initialType, initialCategories,
  initialExperience, initialLocation, initialLocationCoords, initialRadius,
}: AlertModalProps) {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [phone, setPhone]       = useState('')
  const [keywords, setKeywords] = useState(initialSearch)
  const [frequency, setFreq]    = useState<'instant' | 'daily' | 'weekly'>('instant')
  const [submitting, setSub]    = useState(false)
  const [done, setDone]         = useState(false)
  const [error, setError]       = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Email is required.'); return }
    setSub(true); setError('')
    try {
      const res = await fetch('/api/alerts/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone,
          keywords: keywords ? keywords.split(/[\s,]+/).filter(Boolean) : [],
          job_types: initialType ? [initialType] : [],
          categories: initialCategories,
          experience_levels: initialExperience,
          location_name: initialLocation || null,
          location_lat: initialLocationCoords?.lat ?? null,
          location_lng: initialLocationCoords?.lng ?? null,
          radius_km: initialRadius,
          frequency,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong')
      setDone(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save alert. Try again.')
    } finally {
      setSub(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-surface rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="font-bold text-text-primary">Create Job Alert</h2>
                <p className="text-xs text-text-muted">Get notified when matching jobs open</p>
              </div>
            </div>
            <button onClick={onClose} className="text-text-muted hover:text-text-primary transition-colors"><X className="w-5 h-5" /></button>
          </div>

          {done ? (
            <div className="text-center py-6 space-y-3">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="font-semibold text-text-primary">Alert created!</h3>
              <p className="text-sm text-text-muted">We'll notify you at <strong>{email}</strong> when matching positions open.</p>
              <button onClick={onClose} className="btn-primary px-6 py-2 mt-2">Done</button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-text-muted">Name (optional)</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" className="input" />
                </div>
                <div className="space-y-1 col-span-2 sm:col-span-1">
                  <label className="text-xs font-semibold text-text-muted">Email *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input" required />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted">Phone for SMS (optional)</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+254 7XX XXX XXX" className="input" />
                <p className="text-[10px] text-text-muted">Kenya (+254), Uganda (+256), Rwanda (+250)</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-muted">Keywords</label>
                <input type="text" value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="e.g. accountant, python, HR" className="input" />
                <p className="text-[10px] text-text-muted">Comma or space separated</p>
              </div>

              {/* Summary of current filters */}
              {(initialType || initialCategories.length > 0 || initialExperience.length > 0 || initialLocation) && (
                <div className="bg-surface-alt rounded-lg p-3 space-y-1.5 text-xs text-text-muted">
                  <p className="font-semibold text-text-primary text-[11px] uppercase tracking-widest">Alert will match your current filters:</p>
                  {initialType && <p>Type: {TYPE_LABELS[initialType] ?? initialType}</p>}
                  {initialCategories.length > 0 && <p>Categories: {initialCategories.join(', ')}</p>}
                  {initialExperience.length > 0 && <p>Level: {initialExperience.map((e) => EXP_LABELS[e] ?? e).join(', ')}</p>}
                  {initialLocation && <p>Location: {initialLocation} ({initialRadius} km)</p>}
                </div>
              )}

              {/* Frequency */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-text-muted">Notification frequency</label>
                <div className="flex gap-2">
                  {(['instant', 'daily', 'weekly'] as const).map((f) => (
                    <button key={f} type="button" onClick={() => setFreq(f)}
                      className={`flex-1 text-xs py-2 rounded-lg border capitalize transition-colors ${frequency === f ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent hover:text-accent'}`}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {error && <p className="text-xs text-red-500">{error}</p>}

              <button type="submit" disabled={submitting} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
                {submitting ? 'Saving…' : 'Create alert'}
              </button>
              <p className="text-[10px] text-text-muted text-center">
                You can unsubscribe at any time via the link in any alert email.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
