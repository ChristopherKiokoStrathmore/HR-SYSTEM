import type { Metadata } from 'next'
import { ExitsClient } from '@/components/modules/hr/exits-client'

export const metadata: Metadata = { title: 'Exiting Employees' }

export default function ExitsPage() {
  return <ExitsClient />
}
