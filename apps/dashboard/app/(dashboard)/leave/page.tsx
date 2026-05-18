import type { Metadata } from 'next'
import { LeaveManagementClient } from '@/components/modules/leave/leave-management-client'

export const metadata: Metadata = { title: 'Leave Management' }

export default function LeavePage() {
  return <LeaveManagementClient />
}
