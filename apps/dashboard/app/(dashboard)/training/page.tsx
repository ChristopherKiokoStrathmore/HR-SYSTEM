import type { Metadata } from 'next'
import { TrainingClient } from '@/components/modules/training/training-client'

export const metadata: Metadata = { title: 'Training' }

export default function TrainingPage() {
  return <TrainingClient />
}
