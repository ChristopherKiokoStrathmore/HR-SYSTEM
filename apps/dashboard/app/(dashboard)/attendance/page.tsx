import type { Metadata } from 'next'
import { AttendanceClient } from '@/components/modules/attendance/attendance-client'

export const metadata: Metadata = { title: 'Attendance' }

export default function AttendancePage() {
  return <AttendanceClient />
}
