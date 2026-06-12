import { BottomNav } from '@/components/mobile/bottom-nav'
import { PageTransition } from '@/components/mobile/page-transition'
import { InstallPrompt } from '@/components/mobile/install-prompt'
import { NotEmployeeScreen } from '@/components/mobile/not-employee-screen'
import { Toaster } from 'sonner'
import { redirect } from 'next/navigation'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'
import { createServiceClient } from '@/lib/supabase-server'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        },
      },
    }
  )
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    redirect('/login')
  }

  const svc = createServiceClient()
  const { data: emp } = await svc
    .from('employee_profiles')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('is_deleted', false)
    .maybeSingle()

  if (!emp) {
    return <NotEmployeeScreen />
  }

  return (
    <div className="pwa-backdrop">
      <div className="pwa-shell" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <PageTransition>{children}</PageTransition>
        </main>
        <BottomNav />
        <InstallPrompt />
        <Toaster
          position="top-center"
          richColors
          toastOptions={{ style: { borderRadius: '16px', fontFamily: 'Inter, sans-serif', marginTop: 'env(safe-area-inset-top)' } }}
        />
      </div>
    </div>
  )
}
