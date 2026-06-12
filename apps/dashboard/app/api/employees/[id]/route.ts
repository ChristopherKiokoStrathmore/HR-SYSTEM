export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)

  const { data, error } = await supabase
    .from('employee_profiles')
    .select(
      `
      *,
      user:users!user_id(full_name, email, avatar_url, phone, preferred_language, last_login_at),
      manager:users!manager_id(full_name, avatar_url),
      company:companies!company_id(name, logo_url, primary_color)
    `
    )
    .eq('id', params.id)
    .eq('is_deleted', false)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ data })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createServerClient(true)
  const body = await req.json()

  // Split user fields from profile fields
  const { full_name, email, phone, preferred_language, avatar_url, ...profileData } = body

  // Update user row if user fields provided
  if (full_name || phone !== undefined || preferred_language) {
    const userUpdate: Record<string, unknown> = {}
    if (full_name) userUpdate.full_name = full_name
    if (phone !== undefined) userUpdate.phone = phone
    if (preferred_language) userUpdate.preferred_language = preferred_language
    if (avatar_url !== undefined) userUpdate.avatar_url = avatar_url

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: empData } = await (supabase.from('employee_profiles') as any)
      .select('user_id')
      .eq('id', params.id)
      .single()

    if (empData?.user_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('users') as any).update(userUpdate).eq('id', empData.user_id)
    }
  }

  // Update profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from('employee_profiles') as any)
    .update(profileData)
    .eq('id', params.id)
    .select(`
      *,
      user:users!user_id(full_name, email, avatar_url, phone, preferred_language),
      company:companies!company_id(name, logo_url)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
