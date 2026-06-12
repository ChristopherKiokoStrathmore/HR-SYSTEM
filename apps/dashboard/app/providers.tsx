'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState, useEffect } from 'react'
import { Toaster } from '@/components/ui/toaster'
import { useStore } from '@/lib/store'

function DarkModeSync() {
  const darkMode = useStore((s) => s.darkMode)
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])
  return null
}

function CompanyAutoSelect() {
  const { activeCompanyId, setActiveCompanyId } = useStore()
  useEffect(() => {
    if (activeCompanyId) return
    fetch('/api/companies?pageSize=1')
      .then(r => r.ok ? r.json() : null)
      .then(json => {
        const first = json?.data?.[0]
        if (first) setActiveCompanyId(first.id)
      })
      .catch(() => {})
  }, [activeCompanyId, setActiveCompanyId])
  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            retry: 3,
            retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000),
          },
          mutations: {
            retry: 1,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <DarkModeSync />
      <CompanyAutoSelect />
      {children}
      <Toaster />
      {process.env.NODE_ENV === 'development' && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  )
}
