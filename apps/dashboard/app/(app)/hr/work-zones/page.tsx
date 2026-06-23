import { WorkZonesClient } from '@/components/modules/hr/work-zones-client'
import { PageHeader } from '@/components/ui/page-header'
import { Globe } from 'lucide-react'

export default function WorkZonesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Work Zones"
        description="Create and manage work zones for geofencing"
        icon={<Globe className="w-6 h-6" />}
      />
      <WorkZonesClient />
    </div>
  )
}
