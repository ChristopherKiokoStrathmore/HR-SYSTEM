'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { createBrowserClient } from '@hr/shared'
import { toast } from '@/lib/toast'

// Subscribes to new candidate inserts via Supabase Realtime and:
// 1. Shows a toast so HR sees applications as they land
// 2. Invalidates the candidates query so the pipeline and live feed refresh
export function useRealtimeCandidates(companyId: string | null) {
  const queryClient = useQueryClient()
  const channelRef = useRef<ReturnType<ReturnType<typeof createBrowserClient>['channel']> | null>(null)

  useEffect(() => {
    if (!companyId) return

    const supabase = createBrowserClient()

    const channel = supabase
      .channel(`candidates:company:${companyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'candidates',
          // Filter to this company's postings via tenant_id
          filter: `tenant_id=eq.${companyId}`,
        },
        (payload) => {
          const candidate = payload.new as { full_name?: string; source?: string }
          const name = candidate.full_name ?? 'Someone'
          const label = candidate.source === 'portal' ? ' via Job Portal' : ''

          toast.success(`New application: ${name}${label}`)

          // Refresh both the pipeline and the live feed
          queryClient.invalidateQueries({ queryKey: ['candidates'] })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidates',
          filter: `tenant_id=eq.${companyId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['candidates'] })
        },
      )
      .subscribe()

    channelRef.current = channel

    return () => {
      supabase.removeChannel(channel)
      channelRef.current = null
    }
  }, [companyId, queryClient])
}
