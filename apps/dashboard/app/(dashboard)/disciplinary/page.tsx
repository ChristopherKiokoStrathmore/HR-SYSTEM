import type { Metadata } from 'next'
import { DisciplinaryClient } from '@/components/modules/hr/disciplinary-client'

export const metadata: Metadata = { title: 'Disciplinary' }

export default function DisciplinaryPage() {
  return <DisciplinaryClient />
}
