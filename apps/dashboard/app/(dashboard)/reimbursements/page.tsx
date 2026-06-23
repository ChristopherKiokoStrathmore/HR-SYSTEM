import type { Metadata } from 'next'
import { ReimbursementsClient } from '@/components/modules/hr/reimbursements-client'

export const metadata: Metadata = { title: 'Reimbursements' }

export default function ReimbursementsPage() {
  return <ReimbursementsClient />
}
