export interface JobPosting {
  id: string
  title: string
  department: string | null
  description: string
  required_keywords: string[]
  employment_type: string
  experience_level: string | null
  location_name: string | null
  location_lat: number | null
  location_lng: number | null
  closing_date: string | null
}

export interface JobAlert {
  id: string
  name: string | null
  email: string
  phone: string | null
  keywords: string[]
  categories: string[]
  job_types: string[]
  experience_levels: string[]
  location_name: string | null
  location_lat: number | null
  location_lng: number | null
  radius_km: number
  unsubscribe_token: string
  frequency: string
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const r = (d: number) => (d * Math.PI) / 180
  const dLat = r(lat2 - lat1)
  const dLng = r(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function alertMatchesJob(alert: JobAlert, job: JobPosting): boolean {
  // Keywords: any alert keyword must appear in title, description, or required_keywords
  if (alert.keywords.length > 0) {
    const haystack = `${job.title} ${job.description} ${job.required_keywords.join(' ')}`.toLowerCase()
    const matches = alert.keywords.some((k) => haystack.includes(k.toLowerCase()))
    if (!matches) return false
  }

  // Job type filter
  if (alert.job_types.length > 0 && !alert.job_types.includes(job.employment_type)) return false

  // Category / department filter
  if (alert.categories.length > 0 && !alert.categories.includes(job.department ?? '')) return false

  // Experience level filter
  if (alert.experience_levels.length > 0 && !alert.experience_levels.includes(job.experience_level ?? '')) return false

  // Location radius filter
  if (alert.location_lat != null && alert.location_lng != null && job.location_lat != null && job.location_lng != null) {
    const dist = haversineKm(alert.location_lat, alert.location_lng, job.location_lat, job.location_lng)
    if (dist > alert.radius_km) return false
  }

  return true
}
