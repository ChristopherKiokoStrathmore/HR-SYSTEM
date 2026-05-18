import type { Metadata } from 'next'
import { EmployeeProfileClient } from '@/components/modules/employees/employee-profile-client'

export const metadata: Metadata = { title: 'Employee Profile' }

export default function EmployeeProfilePage({ params }: { params: { id: string } }) {
  return <EmployeeProfileClient id={params.id} />
}
