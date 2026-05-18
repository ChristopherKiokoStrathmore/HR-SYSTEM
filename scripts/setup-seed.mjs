#!/usr/bin/env node
/**
 * Automates demo-user creation and seed data loading for the Sheer Logic HR system.
 *
 * What it does:
 *   1. Reads Supabase credentials from apps/dashboard/.env.local
 *   2. Creates 8 demo auth users via the Supabase Admin HTTP API (no CLI needed)
 *   3. Patches supabase/seed.sql with the real UUIDs → supabase/seed.patched.sql
 *   4. Runs the patched seed against the linked remote database
 *
 * Usage (from repo root):
 *   node scripts/setup-seed.mjs
 */
import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ── Read credentials from .env.local ─────────────────────────────────────────
function readEnv(filePath) {
  try {
    return Object.fromEntries(
      readFileSync(filePath, 'utf8')
        .split('\n')
        .filter(l => l && !l.startsWith('#') && l.includes('='))
        .map(l => {
          const idx = l.indexOf('=')
          return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
        })
    )
  } catch {
    return {}
  }
}

const env = readEnv(join(ROOT, 'apps/dashboard/.env.local'))
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('\nERROR: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing in apps/dashboard/.env.local')
  process.exit(1)
}

// ── Demo users ────────────────────────────────────────────────────────────────
const DEMO_USERS = [
  { email: 'admin@demo.co.ke',   varName: 'uid_admin' },
  { email: 'hr@demo.co.ke',      varName: 'uid_hr'    },
  { email: 'manager@demo.co.ke', varName: 'uid_mgr'   },
  { email: 'david@demo.co.ke',   varName: 'uid_e1'    },
  { email: 'esther@demo.co.ke',  varName: 'uid_e2'    },
  { email: 'felix@demo.co.ke',   varName: 'uid_e3'    },
  { email: 'grace@demo.co.ke',   varName: 'uid_e4'    },
  { email: 'henry@demo.co.ke',   varName: 'uid_e5'    },
]
const PASSWORD = 'Demo1234!'

// ── Create or fetch a user via Supabase Admin API ─────────────────────────────
async function upsertUser(email) {
  const headers = {
    'Content-Type':  'application/json',
    'apikey':        SERVICE_ROLE_KEY,
    'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  }

  // Try creating first
  const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method:  'POST',
    headers,
    body: JSON.stringify({ email, password: PASSWORD, email_confirm: true }),
  })

  if (createRes.ok) {
    const body = await createRes.json()
    return body.id
  }

  const errBody = await createRes.json().catch(() => ({}))

  // If the user already exists, look them up
  if (createRes.status === 422 || errBody?.msg?.includes('already been registered')) {
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
      { headers }
    )
    if (listRes.ok) {
      const list = await listRes.json()
      const users = list.users ?? []
      const match = users.find(u => u.email === email)
      if (match) return match.id
    }
  }

  throw new Error(`Failed to create ${email}: ${JSON.stringify(errBody)}`)
}

// ── Main ──────────────────────────────────────────────────────────────────────
console.log('\n=== Sheer Logic HR — Seed Setup ===\n')

const resolved = []

for (const user of DEMO_USERS) {
  process.stdout.write(`  ${user.email} … `)
  try {
    const uuid = await upsertUser(user.email)
    resolved.push({ ...user, uuid })
    console.log(`✓  ${uuid}`)
  } catch (err) {
    console.log(`ERROR: ${err.message}`)
    resolved.push({ ...user, uuid: null })
  }
}

console.log()

const missing = resolved.filter(r => !r.uuid)
if (missing.length > 0) {
  console.error(`\nFailed to resolve UUIDs for: ${missing.map(u => u.email).join(', ')}`)
  process.exit(1)
}

// ── Patch seed.sql ────────────────────────────────────────────────────────────
const seedPath    = join(ROOT, 'supabase/seed.sql')
const patchedPath = join(ROOT, 'supabase/seed.patched.sql')
let seed = readFileSync(seedPath, 'utf8')

for (const { varName, uuid } of resolved) {
  // Matches:  uid_admin UUID := '00000000-…'
  seed = seed.replace(
    new RegExp(`(${varName}\\s+UUID\\s*:=\\s*')[^']+(')`),
    `$1${uuid}$2`
  )
}

writeFileSync(patchedPath, seed, 'utf8')
console.log(`✓  Wrote supabase/seed.patched.sql\n`)

// ── Run patched seed against remote DB ───────────────────────────────────────
console.log('Running seed against remote database…\n')
try {
  execSync(
    `npx supabase db query --linked --file supabase/seed.patched.sql`,
    { cwd: ROOT, stdio: 'inherit' }
  )
  console.log('\n✓  Seed data loaded successfully!\n')
  console.log('Demo login credentials:')
  console.log('  admin@demo.co.ke    →  super_admin  (password: Demo1234!)')
  console.log('  hr@demo.co.ke       →  hr_admin')
  console.log('  manager@demo.co.ke  →  manager')
  console.log('  david@demo.co.ke    →  employee')
  console.log()
} catch (err) {
  console.error('\nSeed query failed — the SQL is saved at supabase/seed.patched.sql')
  console.error('You can run it manually in the Supabase dashboard SQL editor.')
  process.exit(1)
}
