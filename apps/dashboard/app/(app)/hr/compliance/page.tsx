import { ComplianceAlertsClient } from '@/components/modules/hr/compliance-client'
import { PageHeader } from '@/components/ui/page-header'
import { AlertTriangle } from 'lucide-react'

export default function ComplianceAlertsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance Alerts"
        description="Monitor employee compliance issues and actions"
        icon={<AlertTriangle className="w-6 h-6" />}
      />
      <ComplianceAlertsClient />
    </div>
  )
}
