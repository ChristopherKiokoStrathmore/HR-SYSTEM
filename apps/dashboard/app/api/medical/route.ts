export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient(true)
    const { searchParams } = new URL(req.url)
    const employeeId = searchParams.get('employeeId')

    if (!employeeId) return NextResponse.json({ error: 'employeeId required', data: [] }, { status: 200 })

    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('is_deleted', false)
      .order('issued_date', { ascending: false })

    if (error) {
      console.error('Medical API error:', error)
      return NextResponse.json({ error: error.message, data: [] }, { status: 200 })
    }
    return NextResponse.json({ data })
  } catch (err) {
    console.error('Medical GET route error:', err)
    return NextResponse.json({ error: 'Internal server error', data: [] }, { status: 200 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient(true)
    const body = await req.json()

    const { data, error } = await supabase
      .from('medical_records')
      .insert(body)
      .select()
      .single()

    if (error) {
      console.error('Medical POST error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ data }, { status: 201 })
  } catch (err) {
    console.error('Medical POST route error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
