export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendApplicationConfirmation } from '@/lib/notifications/application-email'
import { screenCv } from '@/lib/ai/screen-cv'

interface JobRow {
  title: string
  description: string
  required_keywords: string[]
  nice_to_have_keywords: string[]
  auto_reject_threshold: number
  company_id: string
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

    const supabase = createServerClient(true)

    const { data: posting } = await supabase
      .from('job_postings')
      .select('title, description, required_keywords, nice_to_have_keywords, auto_reject_threshold, company_id')
      .eq('id', params.id)
      .eq('is_deleted', false)
      .eq('status', 'open')
      .single<JobRow>()

    if (!posting) {
      return NextResponse.json({ error: 'This position is no longer accepting applications' }, { status: 404 })
    }

    // Duplicate check
    const { data: existing } = await supabase
      .from('candidates')
      .select('id')
      .eq('job_posting_id', params.id)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { error: 'You have already applied for this position with this email address' },
        { status: 409 },
      )
    }

    // Create candidate
    const trackingToken = crypto.randomUUID()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: candidate, error: insertError } = await (supabase.from('candidates') as any)
      .insert({
        job_posting_id: params.id,
        tenant_id: posting.company_id,
        full_name: full_name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim() ?? null,
        cv_url: '',
        cv_text: cvText ?? null,
        notes: cover_note?.trim() ?? null,
        current_stage: 'screened',
        ai_extracted_skills: [],
        tracking_token: trackingToken,
        source: 'portal',
      })
      .select('id, tracking_token')
      .single()

    if (insertError) {
      console.error('Candidate insert error:', insertError)
      return NextResponse.json({ error: 'Failed to submit application. Please try again.' }, { status: 500 })
    }

    // Record consent metadata (columns added by sql/sheerlogic_extensions.sql;
    // non-fatal until that migration is applied to Supabase).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: consentError } = await (supabase.from('candidates') as any)
      .update({
        data_consent: true,
        consent_at: new Date().toISOString(),
        data_retention_months: data_retention_months ?? 12,
      })
      .eq('id', candidate.id)
    if (consentError) {
      console.warn('Consent columns not yet in candidates table:', consentError.message)
    }

    // AI screening is awaited here so the score is persisted before the request ends.
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
          const autoRejected = aiResult.match_score < posting.auto_reject_threshold
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from('candidates') as any)
            .update({
              ai_score: aiResult.match_score,
              ai_summary: aiResult.summary,
              ai_extracted_skills: aiResult.skills,
              ai_experience_years: aiResult.experience_years,
              ai_education: aiResult.education,
              current_stage: autoRejected ? 'rejected' : 'screened',
              rejection_reason: autoRejected
                ? `Auto-rejected: score ${aiResult.match_score} below threshold ${posting.auto_reject_threshold}`
                : null,
            })
            .eq('id', candidate.id)
        }
      } catch (err) {
        console.error('AI screening failed (non-fatal):', err)
      }
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
