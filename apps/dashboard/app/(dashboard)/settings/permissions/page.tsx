import type { Metadata } from 'next'
import { PermissionsClient } from '@/components/modules/settings/permissions-client'

export const metadata: Metadata = { title: 'Permissions' }

export default function PermissionsPage() {
  return <PermissionsClient />
}
