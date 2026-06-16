export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

/**
 * Generic data export — no UI currently calls this (checked: zero
 * references in apps/dashboard/components), so there's no established
 * contract to match. Implemented as a passthrough by resource `type` so
 * it's usable rather than a permanent 501, but treat the shape as
 * provisional until something actually consumes it.
 */
const RESOURCE_PATHS: Record<string, string> = {
  employees: '/all-employees/',
  payroll: '/payroll-runs/',
  leave: '/leave/',
  candidates: '/candidates/',
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type') ?? 'employees'
  const path = RESOURCE_PATHS[type]
  if (!path) {
    return NextResponse.json({ error: `Unknown export type "${type}"` }, { status: 400 })
  }

  const { data, count, error } = await djangoGet(path, {
    company_id: searchParams.get('companyId') || undefined,
    page_size: 5000,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data, count: count ?? 0 })
}
