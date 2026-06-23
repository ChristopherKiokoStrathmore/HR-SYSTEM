import { OvertimeRequestsClient } from '@/components/modules/hr/overtime-client'
import { PageHeader } from '@/components/ui/page-header'
import { Clock } from 'lucide-react'

export default function OvertimeRequestsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Overtime Requests"
        description="Manage employee overtime requests and approvals"
        icon={<Clock className="w-6 h-6" />}
      />
      <OvertimeRequestsClient />
    </div>
  )
}
