export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { hrApi, HRApiError } from '@/lib/hr-api'
import { checkRateLimit } from '@/lib/rate-limit'
import { screenCv } from '@/lib/ai/screen-cv'

interface JobPostingRow {
  title: string
  description: string
  required_keywords: string[]
  nice_to_have_keywords: string[]
  auto_reject_threshold: number
}

export async function POST(req: NextRequest) {
  const limited = await checkRateLimit(req, 'strict')
  if (limited) return limited

  try {
    const body = await req.json()
    const { jobPostingId, cvText, candidateId, fileBase64, mimeType } = body as {
      jobPostingId: string
      cvText?: string
      candidateId?: string
      fileBase64?: string
      mimeType?: string
    }

    if (!jobPostingId || (!cvText && !fileBase64)) {
      return NextResponse.json({ error: 'jobPostingId and either cvText or fileBase64 required' }, { status: 400 })
    }

    let posting: JobPostingRow | null = null
    try {
      posting = await hrApi<JobPostingRow>(`/job-postings/${jobPostingId}/`)
    } catch (err) {
      if (err instanceof HRApiError && err.status === 404) {
        return NextResponse.json({ error: 'Job posting not found' }, { status: 404 })
      }
      throw err
    }

    if (!posting) {
      return NextResponse.json({ error: 'Job posting not found' }, { status: 404 })
    }

    const screening = await screenCv({
      jobTitle: posting.title,
      jobDescription: posting.description,
      requiredKeywords: posting.required_keywords,
      niceToHaveKeywords: posting.nice_to_have_keywords,
      cvText,
      fileBase64,
      mimeType,
    })

    if (!screening) {
      return NextResponse.json(
        { error: 'AI screening unavailable — set GROQ_API_KEY or ANTHROPIC_API_KEY' },
        { status: 503 },
      )
    }

    const { result: aiResult, provider } = screening
    const autoRejected = aiResult.match_score < posting.auto_reject_threshold

    if (candidateId) {
      try {
        await hrApi<unknown>(`/candidates/${candidateId}/`, {
          method: 'PATCH',
          body: {
            ai_score: aiResult.match_score,
            ai_summary: aiResult.summary,
            ai_extracted_skills: aiResult.skills,
            ai_experience_years: aiResult.experience_years,
            ai_education: aiResult.education,
            current_stage: autoRejected ? 'rejected' : 'screened',
            rejection_reason: autoRejected
              ? `Auto-rejected: score ${aiResult.match_score} below threshold ${posting.auto_reject_threshold}`
              : null,
          },
        })
      } catch (updateErr) {
        console.error('CV screening: failed to update candidate:', updateErr)
        // Non-fatal — still return the screening result
      }
    }

    return NextResponse.json({
      success: true,
      result: aiResult,
      autoRejected,
      threshold: posting.auto_reject_threshold,
      provider,
    })
  } catch (err) {
    console.error('CV screening error:', err)
    if (err instanceof HRApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    return NextResponse.json({ error: 'Failed to screen CV' }, { status: 500 })
  }
}
