import type { Metadata } from 'next'
import { OvertimeClient } from '@/components/modules/hr/overtime-client'

export const metadata: Metadata = { title: 'Overtime Requests' }

export default function OvertimePage() {
  return <OvertimeClient />
}
