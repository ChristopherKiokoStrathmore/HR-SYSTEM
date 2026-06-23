import { LeaveRecallsClient } from '@/components/modules/hr/leave-recalls-client'
import { PageHeader } from '@/components/ui/page-header'
import { LogOut } from 'lucide-react'

export default function LeaveRecallsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave Recalls"
        description="Manage employee leave recalls and approvals"
        icon={<LogOut className="w-6 h-6" />}
      />
      <LeaveRecallsClient />
    </div>
  )
}
