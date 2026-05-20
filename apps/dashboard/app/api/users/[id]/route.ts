export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerClient(true)
    const body = await req.json()
    const allowed = ['role', 'is_active', 'preferred_language', 'phone']
    const patch = Object.fromEntries(Object.entries(body).filter(([k]) => allowed.includes(k)))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.from('users') as any)
      .update(patch)
      .eq('id', params.id)
      .select('id, full_name, email, role, is_active, preferred_language')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
