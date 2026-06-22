export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendApplicationConfirmation } from '@/lib/notifications/application-email'

const DJANGO_BASE_URL = (process.env.DJANGO_BASE_URL ?? '').replace(/\/$/, '')

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await checkRateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json()
    const {
      full_name, email, phone,
      cover_note, cvText,
      data_consent, data_retention_months,
    } = body as {
      full_name?: string
      email?: string
      phone?: string
      cover_note?: string
      cvText?: string
      data_consent?: boolean
      data_retention_months?: number
    }

    if (!full_name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }
    if (data_consent !== true) {
      return NextResponse.json(
        { error: 'Data processing consent is required to apply' },
        { status: 400 },
      )
    }

    // Forward raw candidate data to Django — Django owns candidate creation and
    // will run AI scoring server-side. No scoring logic lives here.
    const djangoRes = await fetch(
      `${DJANGO_BASE_URL}/api/careers/jobs/${params.id}/apply/`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name:              full_name.trim(),
          email:                  email.toLowerCase().trim(),
          phone:                  phone?.trim() ?? null,
          notes:                  cover_note?.trim() ?? null,
          cv_text:                cvText ?? null,
          cv_url:                 '',
          data_consent:           true,
          data_retention_months:  data_retention_months ?? 12,
          source:                 'careers_site',
        }),
      },
    )

    const data = await djangoRes.json()

    if (!djangoRes.ok) {
      return NextResponse.json(
        { error: data.error ?? 'Failed to submit application. Please try again.' },
        { status: djangoRes.status },
      )
    }

    const trackingToken = data.tracking_token as string | undefined

    // Django doesn't send a confirmation email yet — do it here so candidates
    // always receive acknowledgement.
    if (trackingToken) {
      sendApplicationConfirmation({
        candidateName:  full_name.trim(),
        candidateEmail: email.toLowerCase().trim(),
        jobTitle:       (data.job_posting as { title?: string } | null)?.title ?? 'the position',
        jobId:          params.id,
        trackingToken,
      })
    }

    return NextResponse.json({ success: true, tracking_token: trackingToken })
  } catch (err) {
    console.error('Apply error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
