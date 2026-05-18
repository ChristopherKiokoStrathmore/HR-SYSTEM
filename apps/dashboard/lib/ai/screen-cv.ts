import type { AiCvResult } from '@hr/shared'

// ─────────────────────────────────────────────────────────────────────────────
// AI CV Screening — provider chain: Groq (free) → Claude (paid) → null
//
// Set GROQ_API_KEY  for the free tier (14,400 requests/day on llama-3.3-70b)
// Set ANTHROPIC_API_KEY for Claude fallback (native PDF support)
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior HR recruiter and CV analyst.
Analyze the submitted CV against the job requirements and return ONLY a JSON object — no markdown, no explanation, no extra text.
Required JSON shape:
{
  "name": "candidate full name",
  "email": "email from CV",
  "phone": "phone from CV",
  "skills": ["array of technical and professional skills found"],
  "experience_years": 0,
  "education": "highest qualification",
  "match_score": 0,
  "summary": "2-sentence candidate assessment",
  "strengths": ["top 3 relevant strengths"],
  "gaps": ["top 3 gaps or missing requirements"]
}
Scoring rubric (0-100): keyword match 40% + experience relevance 35% + education fit 15% + presentation quality 10%.
Be realistic and critical — a score of 80+ should be genuinely impressive.`

// Extract readable text from a base64 PDF buffer
async function extractPdfText(base64: string): Promise<string> {
  try {
    const buffer = Buffer.from(base64, 'base64')
    // Use the internal module directly — bypasses pdf-parse's test-file loading
    // which fails in Next.js production builds
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const parse = require('pdf-parse/lib/pdf-parse.js')
    const { text } = await parse(buffer)
    return text.trim().slice(0, 8000)
  } catch {
    // Fallback: brute-force extract printable ASCII from raw PDF bytes
    const raw = Buffer.from(base64, 'base64').toString('latin1')
    return raw
      .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
      .replace(/\s{4,}/g, '\n')
      .trim()
      .slice(0, 4000)
  }
}

function buildUserMessage(
  jobTitle: string,
  jobDescription: string,
  requiredKeywords: string[],
  niceToHaveKeywords: string[],
  cvText: string,
): string {
  return `JOB TITLE: ${jobTitle}
REQUIRED SKILLS: ${requiredKeywords.join(', ')}
NICE TO HAVE: ${niceToHaveKeywords.join(', ')}
JOB DESCRIPTION: ${jobDescription.slice(0, 1000)}

CV CONTENT:
${cvText.slice(0, 5500)}

Analyze and return the JSON.`
}

// ── Groq (free) ───────────────────────────────────────────────────────────────
async function tryGroq(
  jobTitle: string, jobDescription: string,
  requiredKeywords: string[], niceToHaveKeywords: string[],
  cvText: string,
): Promise<AiCvResult | null> {
  const key = process.env.GROQ_API_KEY
  if (!key || !cvText.trim()) return null

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user',   content: buildUserMessage(jobTitle, jobDescription, requiredKeywords, niceToHaveKeywords, cvText) },
        ],
        temperature: 0.15,
        max_tokens: 1024,
        response_format: { type: 'json_object' }, // guaranteed valid JSON
      }),
    })
    if (!res.ok) {
      console.warn('[screenCv/groq] HTTP', res.status, await res.text())
      return null
    }
    const data = await res.json()
    const raw = data.choices?.[0]?.message?.content ?? ''
    return JSON.parse(raw) as AiCvResult
  } catch (err) {
    console.warn('[screenCv/groq] failed:', err)
    return null
  }
}

// ── Claude fallback (supports native PDF) ─────────────────────────────────────
async function tryClaude(
  jobTitle: string, jobDescription: string,
  requiredKeywords: string[], niceToHaveKeywords: string[],
  cvText: string,
  fileBase64?: string,
  mimeType?: string,
): Promise<AiCvResult | null> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return null

  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: key })

    const jobCtx = `JOB: ${jobTitle}
REQUIRED: ${requiredKeywords.join(', ')}
NICE TO HAVE: ${niceToHaveKeywords.join(', ')}
DESCRIPTION: ${jobDescription.slice(0, 800)}
Return ONLY JSON: {"name":"","email":"","phone":"","skills":[],"experience_years":0,"education":"","match_score":0,"summary":"","strengths":[],"gaps":[]}`

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content: any[] = fileBase64 && mimeType
      ? [
          { type: 'document', source: { type: 'base64', media_type: mimeType, data: fileBase64 } },
          { type: 'text', text: jobCtx },
        ]
      : [{ type: 'text', text: `${jobCtx}\n\nCV:\n${cvText.slice(0, 6000)}` }]

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content }],
    })
    const raw = msg.content[0].type === 'text' ? msg.content[0].text : ''
    return JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()) as AiCvResult
  } catch (err) {
    console.warn('[screenCv/claude] failed:', err)
    return null
  }
}

// ── Public API ────────────────────────────────────────────────────────────────
export async function screenCv(params: {
  jobTitle: string
  jobDescription: string
  requiredKeywords: string[]
  niceToHaveKeywords: string[]
  cvText?: string
  fileBase64?: string
  mimeType?: string
}): Promise<{ result: AiCvResult; provider: 'groq' | 'claude' } | null> {
  const { jobTitle, jobDescription, requiredKeywords, niceToHaveKeywords, cvText, fileBase64, mimeType } = params

  // Resolve CV text (needed for Groq since it can't read PDFs directly)
  let resolvedText = cvText ?? ''
  if (!resolvedText && fileBase64 && mimeType === 'application/pdf') {
    resolvedText = await extractPdfText(fileBase64)
  }

  // 1. Try Groq (free)
  const groqResult = await tryGroq(jobTitle, jobDescription, requiredKeywords, niceToHaveKeywords, resolvedText)
  if (groqResult) return { result: groqResult, provider: 'groq' }

  // 2. Try Claude (fallback, supports native PDF)
  const claudeResult = await tryClaude(jobTitle, jobDescription, requiredKeywords, niceToHaveKeywords, resolvedText, fileBase64, mimeType)
  if (claudeResult) return { result: claudeResult, provider: 'claude' }

  return null
}
