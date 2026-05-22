import type { Metadata } from 'next'
import { BackgroundChecksClient } from '@/components/modules/background-checks/background-checks-client'

export const metadata: Metadata = { title: 'Background Checks' }

export default function BackgroundChecksPage() {
  return <BackgroundChecksClient />
}
