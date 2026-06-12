import type { Metadata } from 'next'
import { GeofenceClient } from '@/components/modules/attendance/geofence-client'

export const metadata: Metadata = { title: 'Geofence Monitor' }

export default function GeofencePage() {
  return <GeofenceClient />
}
