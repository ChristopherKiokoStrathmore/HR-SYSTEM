import type { Metadata } from 'next'
import { SettingsClient } from '@/components/modules/settings/settings-client'

export const metadata: Metadata = { title: 'Settings' }

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-muted mt-1">Manage company profile, user roles, and system activity</p>
      </div>
      <SettingsClient />
    </div>
  )
}
