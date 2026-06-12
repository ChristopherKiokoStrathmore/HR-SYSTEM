'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import { UserX } from 'lucide-react'

export function NotEmployeeScreen() {
  const router = useRouter()

  async function handleSignOut() {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
    )
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="pwa-backdrop">
      <div className="pwa-shell flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-surface-alt flex items-center justify-center mx-auto">
            <UserX className="w-8 h-8 text-text-muted" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-text-primary">Employees Only</h1>
            <p className="text-sm text-text-muted mt-1">
              This portal is for employees only. Please sign in with your employee account.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full py-3 px-6 rounded-2xl bg-accent text-white font-medium text-sm"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}
