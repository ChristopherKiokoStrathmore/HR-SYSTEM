import type { Metadata } from 'next'
import { AuditLogClient } from '@/components/modules/settings/audit-log-client'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
      <AuditLogClient />
    </div>
  )
}
