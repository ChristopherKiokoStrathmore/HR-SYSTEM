export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'CV screening requires job postings — not yet available' }, { status: 501 })
}
