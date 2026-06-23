import type { Metadata } from 'next'
import { AnnouncementsClient } from '@/components/modules/announcements/announcements-client'

export const metadata: Metadata = { title: 'Announcements' }

export default function AnnouncementsPage() {
  return <AnnouncementsClient />
}
