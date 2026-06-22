export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit } from '@/lib/rate-limit'
import { sendApplicationConfirmation } from '@/lib/notifications/application-email'
import { getDb } from '@/lib/db.server'

const DJANGO_BASE_URL = (process.env.DJANGO_BASE_URL ?? '').replace(/\/$/, '')

// Inline Groq CV scoring — no external lib dependency between apps
async function scoreWithGroq(params: {
  jobTitle: string
  jobDescription: string
  requiredKeywords: string[]
  niceToHaveKeywords: string[]
  cvText: string
}): Promise<{ match_score: number; summary: string; skills: string[]; experience_years: number; education: string } | null> {
  const key = process.env.GROQ_API_KEY
  if (!key || !params.cvText.trim()) return null

  const systemPrompt = `You are a senior HR recruiter. Analyze the CV against the job requirements and return ONLY a valid JSON object — no markdown, no explanation.
Required shape: {"match_score":0,"summary":"2-sentence assessment","skills":["skill1"],"experience_years":0,"education":"highest qualification","strengths":["s1"],"gaps":["g1"]}
Scoring rubric (0-100): keyword match 40% + experience relevance 35% + education 15% + presentation 10%. Be realistic — 80+ is genuinely impressive.`

  const userMsg = `JOB: ${params.jobTitle}
REQUIRED: ${params.requiredKeywords.join(', ')}
NICE TO HAVE: ${params.niceToHaveKeywords.join(', ')}
DESCRIPTION: ${params.jobDescription.slice(0, 800)}

CV:
${params.cvText.slice(0, 5000)}

Return only JSON.`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMsg },
        ],
        temperature: 0.15,
        max_tokens: 512,
        response_format: { type: 'json_object' },
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return JSON.parse(data.choices?.[0]?.message?.content ?? 'null')
  } catch {
    return null
  }
}

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

    // Fetch job details for AI screening context
    type JobDetails = {
      title: string
      description: string
      required_keywords: string[]
      nice_to_have_keywords: string[]
    }
    let jobDetails: JobDetails | null = null
    try {
      const sql = getDb()
      const rows = await sql`
        SELECT title, description, required_keywords, nice_to_have_keywords
        FROM job_postings WHERE id = ${params.id} AND is_deleted = false LIMIT 1
      `
      if (rows.length) jobDetails = rows[0] as unknown as JobDetails
    } catch { /* non-fatal — screening skipped */ }

    // Run Groq screening if we have CV text and job context
    let aiPayload: Record<string, unknown> = {}
    if (cvText && jobDetails) {
      const aiResult = await scoreWithGroq({
        jobTitle: jobDetails.title,
        jobDescription: jobDetails.description,
        requiredKeywords: jobDetails.required_keywords ?? [],
        niceToHaveKeywords: jobDetails.nice_to_have_keywords ?? [],
        cvText,
      })
      if (aiResult) {
        aiPayload = {
          ai_score:            aiResult.match_score,
          ai_summary:          aiResult.summary,
          ai_extracted_skills: aiResult.skills ?? [],
          ai_experience_years: aiResult.experience_years,
          ai_education:        aiResult.education,
        }
      }
    }

    // Forward to Django — includes AI fields so they're persisted in one shot
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
          ...aiPayload,
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
