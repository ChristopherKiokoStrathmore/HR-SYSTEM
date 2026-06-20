export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db.server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendApplicationConfirmation } from '@/lib/notifications/application-email'
import { screenCv } from '@/lib/ai/screen-cv'

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

    if (data_consent !== true) {
      return NextResponse.json(
        { error: 'Data processing consent is required to apply' },
        { status: 400 },
      )
    }

    const sql = getDb()

    // Fetch the job posting
    const postingRows = await sql`
      SELECT title, description, required_keywords, nice_to_have_keywords, auto_reject_threshold, company_id
      FROM job_postings
      WHERE id = ${params.id} AND is_deleted = false AND status = 'open'
    `
    if (!postingRows.length) {
      return NextResponse.json({ error: 'This position is no longer accepting applications' }, { status: 404 })
    }
    const posting = postingRows[0]

    // Duplicate check
    const existing = await sql`
      SELECT id FROM candidates
      WHERE job_posting_id = ${params.id} AND email = ${email.toLowerCase().trim()}
    `
    if (existing.length) {
      return NextResponse.json(
        { error: 'You have already applied for this position with this email address' },
        { status: 409 },
      )
    }

    // Create candidate
    const trackingToken = crypto.randomUUID()
    const inserted = await sql`
      INSERT INTO candidates (
        job_posting_id, tenant_id, full_name, email, phone, cv_url, cv_text, notes,
        current_stage, ai_extracted_skills, tracking_token, source,
        data_consent, consent_at, data_retention_months
      ) VALUES (
        ${params.id}, ${posting.company_id}, ${full_name.trim()}, ${email.toLowerCase().trim()},
        ${phone?.trim() ?? null}, ${''}, ${cvText ?? null}, ${cover_note?.trim() ?? null},
        ${'screened'}, ${sql.array([] as string[])}, ${trackingToken}, ${'portal'},
        ${true}, ${new Date().toISOString()}, ${data_retention_months ?? 12}
      )
      RETURNING id, tracking_token
    `

    if (!inserted.length) {
      return NextResponse.json({ error: 'Failed to submit application. Please try again.' }, { status: 500 })
    }

    const candidate = inserted[0]

    // AI screening (non-fatal)
    if (cvText || fileBase64) {
      try {
        const screening = await screenCv({
          jobTitle: posting.title as string,
          jobDescription: posting.description as string,
          requiredKeywords: posting.required_keywords as string[],
          niceToHaveKeywords: posting.nice_to_have_keywords as string[],
          cvText,
          fileBase64,
          mimeType,
        })

        if (screening) {
          const { result: aiResult } = screening
          const autoRejected = aiResult.match_score < (posting.auto_reject_threshold as number)
          await sql`
            UPDATE candidates SET
              ai_score              = ${aiResult.match_score},
              ai_summary            = ${aiResult.summary},
              ai_extracted_skills   = ${sql.array(aiResult.skills)},
              ai_experience_years   = ${aiResult.experience_years},
              ai_education          = ${aiResult.education},
              current_stage         = ${autoRejected ? 'rejected' : 'screened'},
              rejection_reason      = ${autoRejected ? `Auto-rejected: score ${aiResult.match_score} below threshold ${posting.auto_reject_threshold}` : null}
            WHERE id = ${candidate.id}
          `
        }
      } catch (err) {
        console.error('AI screening failed (non-fatal):', err)
      }
    }

    // Send confirmation email (non-blocking)
    sendApplicationConfirmation({
      candidateName:  full_name.trim(),
      candidateEmail: email.toLowerCase().trim(),
      jobTitle:       posting.title as string,
      jobId:          params.id,
      trackingToken:  candidate.tracking_token as string,
    })

    return NextResponse.json({ success: true, tracking_token: candidate.tracking_token })
  } catch (err) {
    console.error('Apply error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
