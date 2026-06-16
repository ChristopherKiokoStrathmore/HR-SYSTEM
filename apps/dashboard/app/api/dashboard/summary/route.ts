export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet } from '@/lib/django-client'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const companyId = searchParams.get('companyId') ?? undefined

    const today = new Date().toISOString().split('T')[0]
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [empRes] = await Promise.all([
      djangoGet('/all-employees/', {
        companyId,
        status: 'active',
        page_size: 1,
      }),
    ])

    // Contract expiries: employees whose end_date is within 30 days
    const { data: expiryData } = await djangoGet('/all-employees/', {
      companyId,
      status: 'active',
      end_date_before: in30,
      end_date_after: today,
      page_size: 5,
    })

    return NextResponse.json({
      data: {
        activeEmployees: empRes.count ?? 0,
        onLeaveToday: 0,
        contractExpiries: expiryData ?? [],
        pendingLeave: [],
      },
    })
  } catch (err) {
    console.error('[summary] route error:', err)
    return NextResponse.json({
      data: { activeEmployees: 0, onLeaveToday: 0, contractExpiries: [], pendingLeave: [] },
      error: 'Failed to fetch dashboard summary',
    })
  }
}
