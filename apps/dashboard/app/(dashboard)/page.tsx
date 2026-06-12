import type { Metadata } from 'next'
import { DashboardHomeClient } from '@/components/modules/dashboard/dashboard-home-client'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardHome() {
  return <DashboardHomeClient />
}
