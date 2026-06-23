import type { Metadata } from 'next'
import { LeaveRecallsClient } from '@/components/modules/hr/leave-recalls-client'

export const metadata: Metadata = { title: 'Leave Recalls' }

export default function LeaveRecallsPage() {
  return <LeaveRecallsClient />
}
