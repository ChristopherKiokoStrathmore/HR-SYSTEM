export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@hr/shared'
import { z } from 'zod'

const schema = z.object({
  name:              z.string().max(120).optional(),
  email:             z.string().email(),
  phone:             z.string().max(20).optional().nullable(),
  keywords:          z.array(z.string()).default([]),
  categories:        z.array(z.string()).default([]),
  job_types:         z.array(z.string()).default([]),
  experience_levels: z.array(z.string()).default([]),
  location_name:     z.string().max(200).optional().nullable(),
  location_lat:      z.number().optional().nullable(),
  location_lng:      z.number().optional().nullable(),
  radius_km:         z.number().int().min(1).max(500).default(50),
  frequency:         z.enum(['instant', 'daily', 'weekly']).default('instant'),
})

export async function POST(req: NextRequest) {
  try {
    const body = schema.parse(await req.json())
    const supabase = createServerClient(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from('job_alerts') as any).insert({
      name:              body.name ?? null,
      email:             body.email,
      phone:             body.phone ?? null,
      keywords:          body.keywords,
      categories:        body.categories,
      job_types:         body.job_types,
      experience_levels: body.experience_levels,
      location_name:     body.location_name ?? null,
      location_lat:      body.location_lat ?? null,
      location_lng:      body.location_lng ?? null,
      radius_km:         body.radius_km,
      frequency:         body.frequency,
    })

    if (error) {
      console.error('[alert/subscribe]', error)
      return NextResponse.json({ error: 'Could not save alert.' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
}
