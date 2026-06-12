import type { Metadata } from 'next'
import { StatutoryRatesClient } from '@/components/modules/settings/statutory-rates-client'

export const metadata: Metadata = { title: 'Statutory Rates' }

export default function StatutoryRatesPage() {
  return <StatutoryRatesClient />
}
