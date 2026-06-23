import { GeofenceViolationsClient } from '@/components/modules/hr/geofence-violations-client'
import { PageHeader } from '@/components/ui/page-header'
import { MapPin } from 'lucide-react'

export default function GeofenceViolationsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Geofence Violations"
        description="Review and resolve out-of-zone violations"
        icon={<MapPin className="w-6 h-6" />}
      />
      <GeofenceViolationsClient />
    </div>
  )
}
