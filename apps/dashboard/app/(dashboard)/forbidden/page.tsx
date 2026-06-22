'use client'

import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { useCurrentUser } from '@/lib/hooks/use-current-user'
import { normalizeRole, roleLabel } from '@/lib/rbac'

export default function ForbiddenPage() {
  const { data } = useCurrentUser()
  const role = normalizeRole(data?.user?.role)

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-5">
        <ShieldAlert className="w-8 h-8 text-red-500" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access restricted</h1>
      <p className="text-gray-500 max-w-md mb-1">
        Your role (<span className="font-medium">{roleLabel(role)}</span>) doesn’t have
        access to this section.
      </p>
      <p className="text-gray-400 text-sm max-w-md mb-6">
        If you believe this is a mistake, ask a company administrator to adjust your
        permissions.
      </p>
      <Link
        href="/"
        className="px-5 py-2.5 rounded-xl bg-accent text-white font-medium hover:opacity-90 transition"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}
