import type { Metadata } from 'next'
import { ComplianceClient } from '@/components/modules/hr/compliance-client'

export const metadata: Metadata = { title: 'Compliance Alerts' }

export default function CompliancePage() {
  return <ComplianceClient />
}
