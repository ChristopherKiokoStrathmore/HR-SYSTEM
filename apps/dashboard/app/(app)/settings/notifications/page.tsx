import { NotificationSettingsClient } from '@/components/settings/notifications-client'
import { PageHeader } from '@/components/ui/page-header'
import { Bell } from 'lucide-react'

export default function NotificationSettingsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Templates"
        description="Configure notification templates for events"
        icon={<Bell className="w-6 h-6" />}
      />
      <NotificationSettingsClient />
    </div>
  )
}
