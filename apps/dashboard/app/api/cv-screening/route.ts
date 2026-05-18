import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@hr/shared'
import type { AiCvResult } from '@hr/shared'
import { checkRateLimit } from '@/lib/rate-limit'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CV_SYSTEM_PROMPT = `You are an expert HR recruiter. Analyze this CV against the job description. Return ONLY valid JSON:
{
  "name": "string",
  "email": "string",
  "phone": "string",
  "skills": ["string"],
  "experience_years": 0,
  "education": "string",
  "match_score": 0,
  "summary": "string (2 sentences max)",
  "strengths": ["string"],
  "gaps": ["string"]
}
Score based on: keyword match 40%, experience relevance 35%, education fit 15%, overall quality 10%.`

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
    const { jobPostingId, cvText, candidateId } = body as {
      jobPostingId: string
      cvText: string
      candidateId?: string
    }

    if (!jobPostingId || !cvText) {
      return NextResponse.json({ error: 'jobPostingId and cvText required' }, { status: 400 })
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

    const userPrompt = `
JOB TITLE: ${posting.title}
JOB DESCRIPTION: ${posting.description}
REQUIRED KEYWORDS: ${posting.required_keywords.join(', ')}
NICE TO HAVE: ${posting.nice_to_have_keywords.join(', ')}

CV CONTENT:
${cvText.slice(0, 6000)}`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: CV_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    const aiResult = JSON.parse(responseText) as AiCvResult

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
    })
  } catch (err) {
    console.error('CV screening error:', err)
    return NextResponse.json({ error: 'Failed to screen CV' }, { status: 500 })
  }
}
