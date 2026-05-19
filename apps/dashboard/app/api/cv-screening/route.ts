export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
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

    const supabase = createServerClient(true)

    const { data: posting } = await supabase
      .from('job_postings')
      .select('title, description, required_keywords, nice_to_have_keywords, auto_reject_threshold')
      .eq('id', jobPostingId)
      .single<JobPostingRow>()

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
        { error: 'AI screening unavailable â€” set GROQ_API_KEY or ANTHROPIC_API_KEY' },
        { status: 503 },
      )
    }

    const { result: aiResult, provider } = screening
    const autoRejected = aiResult.match_score < posting.auto_reject_threshold

    if (candidateId) {
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
        .eq('id', candidateId)
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
    return NextResponse.json({ error: 'Failed to screen CV' }, { status: 500 })
  }
}
