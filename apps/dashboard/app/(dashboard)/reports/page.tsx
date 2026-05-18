import type { Metadata } from 'next'
import { ReportsClient } from '@/components/modules/reports/reports-client'

export const metadata: Metadata = { title: 'Reports & Analytics' }

export default function ReportsPage() {
  return <ReportsClient />
}
