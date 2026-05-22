export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { createServerClient as createSSRClient } from '@supabase/ssr'
import { createServerClient } from '@hr/shared'
import { cookies } from 'next/headers'
import type { CookieOptions } from '@supabase/ssr'

export async function GET() {
  const cookieStore = await cookies()
  const supabase = createSSRClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        get: (name: string) => cookieStore.get(name)?.value,
        set: (_n: string, _v: string, _o: CookieOptions) => {},
        remove: (_n: string, _o: CookieOptions) => {},
      },
    }
  )

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServerClient(true)
  const { data: user } = await (service.from('users') as any)
    .select('id, full_name, email, role, avatar_url, company_id, is_active')
    .eq('email', session.user.email)
    .eq('is_deleted', false)
    .single()

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })
  return NextResponse.json({ data: user })
}
