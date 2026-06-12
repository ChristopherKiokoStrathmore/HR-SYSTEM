import type { Metadata } from 'next'
import { CertificatesClient } from '@/components/modules/hr/certificates-client'

export const metadata: Metadata = { title: 'Certificates' }

export default function CertificatesPage() {
  return <CertificatesClient />
}
