import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { NextRequest, NextResponse } from 'next/server'

type Tier = 'strict' | 'moderate' | 'loose'

const TIERS: Record<Tier, Parameters<typeof Ratelimit.slidingWindow>> = {
  strict:   [5,  '1 m'],   // AI / expensive endpoints
  moderate: [20, '1 m'],   // financial mutations
  loose:    [60, '1 m'],   // general reads
}

const limiters: Partial<Record<Tier, Ratelimit>> = {}

function getLimiter(tier: Tier): Ratelimit | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null  // not configured — skip silently
  }
  if (!limiters[tier]) {
    limiters[tier] = new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(...TIERS[tier]),
      analytics: false,
      prefix: `rl:${tier}`,
    })
  }
  return limiters[tier]!
}

/**
 * Call at the top of a route handler. Returns a 429 Response if rate-limited,
 * or null if the request is allowed (caller should continue).
 *
 * @example
 * const limited = await checkRateLimit(req, 'strict')
 * if (limited) return limited
 */
export async function checkRateLimit(
  req: NextRequest,
  tier: Tier = 'moderate',
  identifier?: string,
): Promise<NextResponse | null> {
  const limiter = getLimiter(tier)
  if (!limiter) return null

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'anonymous'

  const id = identifier ?? ip
  const { success, limit, remaining, reset } = await limiter.limit(id)

  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests — please slow down.' },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit':     limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset':     reset.toString(),
          'Retry-After':           Math.ceil((reset - Date.now()) / 1000).toString(),
        },
      },
    )
  }

  return null
}
