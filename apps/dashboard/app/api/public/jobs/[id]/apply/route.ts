import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@hr/shared'
import { checkRateLimit } from '@/lib/rate-limit'
import type { AiCvResult } from '@hr/shared'

const CV_SYSTEM_PROMPT = `You are an expert HR recruiter. Analyze this CV against the job description. Return ONLY valid JSON with no markdown fences:
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

function stripCodeFences(text: string) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
}

interface JobRow {
  title: string
  description: string
  required_keywords: string[]
  nice_to_have_keywords: string[]
  auto_reject_threshold: number
  company_id: string
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const limited = await checkRateLimit(req, 'strict')
  if (limited) return limited

  try {
    const body = await req.json()
    const { full_name, email, phone, cover_note, cvText, fileBase64, mimeType } = body as {
      full_name: string
      email: string
      phone?: string
      cover_note?: string
      cvText?: string
      fileBase64?: string
      mimeType?: 'application/pdf' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    }

    if (!full_name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
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
      return NextResponse.json({ error: 'Job posting not found or no longer accepting applications' }, { status: 404 })
    }

    // Check for duplicate application
    const { data: existing } = await supabase
      .from('candidates')
      .select('id')
      .eq('job_posting_id', params.id)
      .eq('email', email.toLowerCase().trim())
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'An application with this email already exists for this position' }, { status: 409 })
    }

    // Create candidate record first
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
      })
      .select('id')
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
    }

    // Run AI screening in the background if API key + CV are available
    if (process.env.ANTHROPIC_API_KEY && (cvText || fileBase64)) {
      try {
        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

        const jobContext = `JOB TITLE: ${posting.title}
JOB DESCRIPTION: ${posting.description}
REQUIRED KEYWORDS: ${posting.required_keywords.join(', ')}
NICE TO HAVE: ${posting.nice_to_have_keywords.join(', ')}`

        const messageContent: Anthropic.MessageParam['content'] = fileBase64 && mimeType
          ? [
              { type: 'document', source: { type: 'base64', media_type: mimeType, data: fileBase64 } } as Anthropic.DocumentBlockParam,
              { type: 'text', text: jobContext },
            ]
          : [{ type: 'text', text: `${jobContext}\n\nCV CONTENT:\n${(cvText ?? '').slice(0, 6000)}` }]

        const message = await anthropic.messages.create({
          model: 'claude-sonnet-4-6',
          max_tokens: 1024,
          system: CV_SYSTEM_PROMPT,
          messages: [{ role: 'user', content: messageContent }],
        })

        const rawText = message.content[0].type === 'text' ? message.content[0].text : ''
        const aiResult = JSON.parse(stripCodeFences(rawText)) as AiCvResult
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
      } catch {
        // AI screening is best-effort — the application is already saved
      }
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Public apply error:', err)
    return NextResponse.json({ error: 'Failed to submit application' }, { status: 500 })
  }
}
