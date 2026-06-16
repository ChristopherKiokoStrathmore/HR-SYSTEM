import { BottomNav } from '@/components/mobile/bottom-nav'
import { PageTransition } from '@/components/mobile/page-transition'
import { InstallPrompt } from '@/components/mobile/install-prompt'
import { NotEmployeeScreen } from '@/components/mobile/not-employee-screen'
import { Toaster } from 'sonner'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  // employeeId is resolved (and stamped into the session) at login time via
  // Django's UserProfile — no per-request DB lookup needed here.
  if (!session.employeeId) {
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
