import type { Metadata } from 'next'
import { createServerClient } from '@hr/shared'
import { JobsClient } from './jobs-client'

export const metadata: Metadata = {
  title: 'Job Centre | Sheer Logic',
  description:
    'Browse live vacancies across Kenya, Uganda and Rwanda. Sheer Logic connects talented professionals with leading organisations.',
}

export default async function JobsPage() {
  const supabase = createServerClient(true)

  const { data } = await supabase
    .from('job_postings')
    .select('id, title, department, description, required_keywords, employment_type, closing_date, created_at, location_name, location_lat, location_lng, experience_level')
    .eq('is_deleted', false)
    .eq('status', 'open')
    .order('created_at', { ascending: false })

  return <JobsClient jobs={data ?? []} />
}
