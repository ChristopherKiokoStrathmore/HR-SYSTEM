import { BottomNav } from '@/components/mobile/bottom-nav'
import { PageTransition } from '@/components/mobile/page-transition'
import { InstallPrompt } from '@/components/mobile/install-prompt'
import { Toaster } from 'sonner'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const raw = cookieStore.get('hr_session')?.value

  if (!raw) {
    redirect('/login')
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
