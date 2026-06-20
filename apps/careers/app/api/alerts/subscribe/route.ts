export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db.server'
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
    const sql = getDb()

    await sql`
      INSERT INTO job_alerts (
        name, email, phone, keywords, categories, job_types, experience_levels,
        location_name, location_lat, location_lng, radius_km, frequency
      ) VALUES (
        ${body.name ?? null}, ${body.email}, ${body.phone ?? null},
        ${sql.array(body.keywords)}, ${sql.array(body.categories)},
        ${sql.array(body.job_types)}, ${sql.array(body.experience_levels)},
        ${body.location_name ?? null}, ${body.location_lat ?? null},
        ${body.location_lng ?? null}, ${body.radius_km}, ${body.frequency}
      )
    `

    return NextResponse.json({ success: true })
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 })
    console.error('[alert/subscribe]', err)
    return NextResponse.json({ error: 'Could not save alert.' }, { status: 500 })
  }
}
