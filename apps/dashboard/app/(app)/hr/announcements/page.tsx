import { AnnouncementsClient } from '@/components/modules/hr/announcements-client'
import { PageHeader } from '@/components/ui/page-header'
import { Megaphone } from 'lucide-react'

export default function AnnouncementsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Announcements"
        description="Create and manage company announcements"
        icon={<Megaphone className="w-6 h-6" />}
      />
      <AnnouncementsClient />
    </div>
  )
}
