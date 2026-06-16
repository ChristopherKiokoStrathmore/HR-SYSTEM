export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { djangoGet, djangoPost } from '@/lib/django-client'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendApplicationConfirmation } from '@/lib/notifications/application-email'
import { screenCv } from '@/lib/ai/screen-cv'

interface JobRow {
  title: string
  description: string
  required_keywords: string[]
  nice_to_have_keywords: string[]
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await checkRateLimit(req)
  if (limited) return limited

  try {
    const body = await req.json()
    const { full_name, email, phone, cover_note, cvText, fileBase64, mimeType, data_consent, data_retention_months } = body as {
      full_name: string
      email: string
      phone?: string
      cover_note?: string
      cvText?: string
      fileBase64?: string
      mimeType?: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      data_consent?: boolean
      data_retention_months?: number
    }

    if (!full_name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Kenya DPA 2019: explicit consent is required before processing applicant data
    if (data_consent !== true) {
      return NextResponse.json(
        { error: 'Data processing consent is required to apply' },
        { status: 400 },
      )
    }

    const { data: posting } = await djangoGet<JobRow>(`/careers/jobs/${params.id}/`)
    if (!posting) {
      return NextResponse.json({ error: 'This position is no longer accepting applications' }, { status: 404 })
    }

    // AI screening is awaited here so the score is included in the create
    // call below (Django decides auto-reject server-side, since the public
    // job endpoint doesn't expose auto_reject_threshold to this route).
    let aiFields: Record<string, unknown> = {}
    if (cvText || fileBase64) {
      try {
        const screening = await screenCv({
          jobTitle: posting.title,
          jobDescription: posting.description,
          requiredKeywords: posting.required_keywords,
          niceToHaveKeywords: posting.nice_to_have_keywords,
          cvText,
          fileBase64,
          mimeType,
        })
        if (screening) {
          const { result: aiResult } = screening
          aiFields = {
            ai_score: aiResult.match_score,
            ai_summary: aiResult.summary,
            ai_extracted_skills: aiResult.skills,
            ai_experience_years: aiResult.experience_years,
            ai_education: aiResult.education,
          }
        }
      } catch (err) {
        console.error('AI screening failed (non-fatal):', err)
      }
    }

    const { data: candidate, error, status } = await djangoPost<{ id: string; tracking_token: string }>(
      `/careers/jobs/${params.id}/apply/`,
      {
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() ?? null,
        cv_text: cvText ?? null,
        notes: cover_note?.trim() ?? null,
        source: 'portal',
        data_consent: true,
        data_retention_months: data_retention_months ?? 12,
        ...aiFields,
      },
    )

    if (error || !candidate) {
      if (status === 409) {
        return NextResponse.json(
          { error: 'You have already applied for this position with this email address' },
          { status: 409 },
        )
      }
      console.error('Candidate create error:', error)
      return NextResponse.json({ error: 'Failed to submit application. Please try again.' }, { status: 500 })
    }

    // Send confirmation email with tracking link (non-blocking)
    sendApplicationConfirmation({
      candidateName:  full_name.trim(),
      candidateEmail: email.toLowerCase().trim(),
      jobTitle:       posting.title,
      jobId:          params.id,
      trackingToken:  candidate.tracking_token,
    })

    return NextResponse.json({ success: true, tracking_token: candidate.tracking_token })
  } catch (err) {
    console.error('Apply error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
