import type { Metadata } from 'next'
import { RecruitmentClient } from '@/components/modules/recruitment/recruitment-client'

export const metadata: Metadata = { title: 'Recruitment' }

export default function RecruitmentPage() {
  return <RecruitmentClient />
}
