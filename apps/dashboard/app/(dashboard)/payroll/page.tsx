import type { Metadata } from 'next'
import { PayrollClient } from '@/components/modules/payroll/payroll-client'

export const metadata: Metadata = {
  title: 'Payroll | HR System',
  description: 'Manage employee payroll and disbursements',
}

export default function PayrollPage() {
  return <PayrollClient />
}
