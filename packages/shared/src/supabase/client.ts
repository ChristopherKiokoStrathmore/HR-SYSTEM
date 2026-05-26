import { createClient } from '@supabase/supabase-js'
import { createBrowserClient as createSSRBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

function getPublicSupabaseKey() {
  const key = (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)?.trim()
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return key
}

// Singleton — one client per browser tab prevents "Multiple GoTrueClient instances" warning.
// Uses @supabase/ssr so the session is stored in cookies (readable by server middleware),
// not just localStorage (which the server can't see).
let _browserClient: ReturnType<typeof createSSRBrowserClient<Database>> | null = null

export function createBrowserClient() {
  if (typeof window === 'undefined') {
    // Server context: stateless, cookie-less fallback
    return createClient<Database>(getSupabaseUrl(), getPublicSupabaseKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  if (!_browserClient) {
    _browserClient = createSSRBrowserClient<Database>(getSupabaseUrl(), getPublicSupabaseKey())
  }
  return _browserClient
}

export function createServerClient(serviceRole = false) {
  const url = getSupabaseUrl()
  const key = serviceRole ? getServiceRoleKey() : getPublicSupabaseKey()
  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
