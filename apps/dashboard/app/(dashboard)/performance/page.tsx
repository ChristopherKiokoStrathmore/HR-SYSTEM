import type { Metadata } from 'next'
import { PerformanceClient } from '@/components/modules/performance/performance-client'

export const metadata: Metadata = { title: 'Performance' }

export default function PerformancePage() {
  return <PerformanceClient />
}
