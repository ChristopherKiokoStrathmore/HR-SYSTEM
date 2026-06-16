export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPost } from '@/lib/django-client'

interface ReviewRow { id: string; reviewer_id: string | null; [key: string]: unknown }
interface UserRow { id: string; full_name: string }

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') || undefined
  const { data: reviews, error } = await djangoGet<ReviewRow[]>('/performance-reviews/', {
    employee_id: searchParams.get('employeeId') || undefined,
    company_id: companyId,
  })
  if (error) return NextResponse.json({ error }, { status: 500 })

  const list = reviews ?? []
  const reviewerIds = [...new Set(list.map((r) => r.reviewer_id).filter(Boolean))]
  let reviewerById = new Map<string, UserRow>()
  if (reviewerIds.length) {
    const { data: users } = await djangoGet<UserRow[]>('/users/', { company_id: companyId })
    reviewerById = new Map((users ?? []).map((u) => [u.id, u]))
  }

  const data = list.map((r) => ({
    ...r,
    reviewer: r.reviewer_id ? { full_name: reviewerById.get(r.reviewer_id)?.full_name ?? 'Unknown' } : undefined,
  }))
  return NextResponse.json({ data })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await djangoPost('/performance-reviews/', body)
  if (error) return NextResponse.json({ error }, { status: 500 })
  return NextResponse.json({ data }, { status: 201 })
}
