export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(true)
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) return NextResponse.json({ error: 'employeeId required', data: [] }, { status: 200 })

    const from = searchParams.get('from')
    const to = searchParams.get('to')

    let query = supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_deleted', false)
      .order('shift_date', { ascending: false })
      .limit(60)

    if (from) query = query.gte('shift_date', from)
    if (to) query = query.lte('shift_date', to)

    const { data, error } = await query

    if (error) {
      console.error('Attendance API error:', error)
      return NextResponse.json({ error: error.message, data: [] }, { status: 200 })
    }
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Attendance GET route error:', err)
    return NextResponse.json({ error: 'Internal server error', data: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient(true)
    const body = await req.json()

    const { data, error } = await supabase
      .from('attendance')
      .upsert(body, { onConflict: 'employee_id,shift_date' })
      .select()
      .single()

    if (error) {
      console.error('Attendance POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Attendance POST route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
