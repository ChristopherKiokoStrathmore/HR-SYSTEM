import { createServerClient as createSsrClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  return url
}

function getPublicSupabaseKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  return key
}

function getServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return key
}

export async function createCookieClient() {
  const cookieStore = await cookies()
  const cookieMethods: CookieMethodsServer = {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      } catch { /* server component — read-only */ }
    },
  }
  return createSsrClient(
    getSupabaseUrl(),
    getPublicSupabaseKey(),
    { cookies: cookieMethods }
  )
}

export function createServiceClient() {
  return createClient(
    getSupabaseUrl(),
    getServiceRoleKey(),
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
