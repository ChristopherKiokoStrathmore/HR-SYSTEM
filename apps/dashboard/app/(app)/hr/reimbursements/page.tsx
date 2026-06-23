import { ReimbursementsClient } from '@/components/modules/hr/reimbursements-client'
import { PageHeader } from '@/components/ui/page-header'
import { DollarSign } from 'lucide-react'

export default function ReimbursementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reimbursements"
        description="Review and process employee reimbursement claims"
        icon={<DollarSign className="w-6 h-6" />}
      />
      <ReimbursementsClient />
    </div>
  )
}
