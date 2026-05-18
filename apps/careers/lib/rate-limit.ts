import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

let limiter: Ratelimit | null = null

function getLimiter(): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  if (!limiter) {
    limiter = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(5, '1 m'),
      prefix: 'rl:careers',
    })
  }
  return limiter
}

export async function checkRateLimit(req: NextRequest): Promise<NextResponse | null> {
  const rl = getLimiter()
  if (!rl) return null

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'anonymous'

  const { success, limit, remaining, reset } = await rl.limit(ip)
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests — please try again shortly.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      },
    )
  }
  return null
}
