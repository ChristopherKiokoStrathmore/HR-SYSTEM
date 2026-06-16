import type { Metadata } from 'next'
import { djangoGet } from '@/lib/django-client'
import { JobsClient, type JobItem } from './jobs-client'

export const metadata: Metadata = {
  title: 'Job Centre | Sheer Logic',
  description:
    'Browse live vacancies across Kenya, Uganda and Rwanda. Sheer Logic connects talented professionals with leading organisations.',
}

export default async function JobsPage() {
  const { data } = await djangoGet<JobItem[]>('/careers/jobs/')

  return <JobsClient jobs={data ?? []} />
}
