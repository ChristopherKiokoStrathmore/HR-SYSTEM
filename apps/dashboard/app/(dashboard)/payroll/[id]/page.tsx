import type { Metadata } from 'next'
import { PayrollRunDetailClient } from '@/components/modules/payroll/payroll-run-detail-client'

export const metadata: Metadata = {
  title: 'Payroll Run Details',
}

interface PageProps {
  params: { id: string }
}

export default function PayrollRunDetailPage({ params }: PageProps) {
  return <PayrollRunDetailClient runId={params.id} />
}
