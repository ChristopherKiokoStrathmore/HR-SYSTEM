import type { Metadata } from 'next'
import { getDb } from '@/lib/db.server'
import { JobsClient } from './jobs-client'

export const metadata: Metadata = {
  title: 'Job Centre | Sheer Logic',
  description:
    'Browse live vacancies across Kenya, Uganda and Rwanda. Sheer Logic connects talented professionals with leading organisations.',
}

export default async function JobsPage() {
  try {
    const sql = getDb()
    const rows = await sql`
      SELECT id, title, department, description, required_keywords, employment_type,
             closing_date, created_at, location_name, location_lat, location_lng, experience_level
      FROM job_postings
      WHERE is_deleted = false AND status = 'open'
      ORDER BY created_at DESC
    `
    return <JobsClient jobs={rows as any[]} />
  } catch {
    return <JobsClient jobs={[]} />
  }
}
