import type { Metadata } from 'next'
import { MedicalClient } from '@/components/modules/medical/medical-client'

export const metadata: Metadata = { title: 'Medical Records' }

export default function MedicalPage() {
  return <MedicalClient />
}
