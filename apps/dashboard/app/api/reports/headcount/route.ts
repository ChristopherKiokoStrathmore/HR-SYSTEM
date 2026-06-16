export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

interface EmployeeRow {
  employment_status: string
  department: string | null
  gender: string | null
  start_date: string
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const companyId = searchParams.get('companyId') ?? undefined

  const { data, error } = await djangoGet<EmployeeRow[]>('/all-employees/', {
    company_id: companyId,
    page_size: 5000,
  })
  if (error) return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 })

  const employees = data ?? []
  const total = employees.length
  const active = employees.filter((e) => e.employment_status === 'active').length

  const deptCounts = new Map<string, number>()
  const genderCounts = new Map<string, number>()
  for (const e of employees) {
    const dept = e.department || 'Unassigned'
    deptCounts.set(dept, (deptCounts.get(dept) ?? 0) + 1)
    const gender = e.gender || 'Unknown'
    genderCounts.set(gender, (genderCounts.get(gender) ?? 0) + 1)
  }

  // Last 12 months of hires
  const now = new Date()
  const monthBuckets: { key: string; month: string; count: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    monthBuckets.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: `${MONTHS[d.getMonth()]} ${String(d.getFullYear()).slice(-2)}`, count: 0 })
  }
  const bucketByKey = new Map(monthBuckets.map((b) => [b.key, b]))
  for (const e of employees) {
    const d = new Date(e.start_date)
    const key = `${d.getFullYear()}-${d.getMonth()}`
    const bucket = bucketByKey.get(key)
    if (bucket) bucket.count++
  }

  return NextResponse.json({
    data: {
      total,
      active,
      byDepartment: [...deptCounts.entries()].map(([name, value]) => ({ name, value })),
      byGender: [...genderCounts.entries()].map(([name, value]) => ({ name, value })),
      monthlyHires: monthBuckets.map(({ month, count }) => ({ month, count })),
    },
  })
}
