import type { Metadata } from 'next'
import { DashboardHomeClient } from '@/components/modules/dashboard/dashboard-home-client'

export const metadata: Metadata = { title: '🏠 Home' }

export default function DashboardHome() {
  return <DashboardHomeClient />
}
