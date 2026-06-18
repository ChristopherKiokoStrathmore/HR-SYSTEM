'use client'

import { useQueryClient } from '@tanstack/react-query'

// Supabase Realtime was removed when the backend moved to Django.
// This hook is kept as a no-op so call sites don't need updating.
// Real-time candidate updates can be restored later via SSE or polling.
export function useRealtimeCandidates(_companyId: string | null) {
  useQueryClient() // keep the hook call so rules-of-hooks stay consistent
}
