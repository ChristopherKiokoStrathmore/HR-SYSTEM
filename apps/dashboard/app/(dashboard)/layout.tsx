import { Sidebar } from '@/components/modules/layout/sidebar'
import { Header } from '@/components/modules/layout/header'
import { Toaster } from 'sonner'
import { CommandPaletteTrigger } from '@/components/ui/command-palette-trigger'
import { AppErrorBoundary } from '@/components/ui/error-boundary'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <AppErrorBoundary>
            {children}
          </AppErrorBoundary>
        </main>
      </div>
      <Toaster position="top-right" richColors toastOptions={{ style: { borderRadius: '12px', fontFamily: 'Inter, sans-serif' } }} />
      <CommandPaletteTrigger />
    </div>
  )
}
