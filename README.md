# Sheer Logic HR System

HR Lifecycle Management System — Turborepo monorepo with an Admin Dashboard (Next.js) and Employee PWA (Next.js).

---

## Repository structure

```
hr-system/
├── apps/
│   ├── dashboard/   # Admin CRM — port 3000
│   └── pwa/         # Employee self-service PWA — port 3001
├── packages/
│   ├── shared/      # DB types, Zod schemas, utils, Supabase client
│   └── i18n/        # en.json + sw.json translations
├── supabase/
│   ├── migrations/  # 0001–0007 migration files
│   ├── seed.sql     # Demo seed data
│   └── functions/   # Edge Functions (send-email, generate-payslip, …)
└── scripts/
    ├── generate-icons.mjs  # Generates PWA + favicon PNGs (no deps)
    └── setup-seed.mjs      # Automates Supabase demo-user creation
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 20 LTS |
| npm | 10+ |
| Supabase CLI | latest (`npm i -g supabase`) |

---

## 1 — Clone & install

```bash
git clone <repo-url> hr-system
cd hr-system
npm install
```

## 2 — Environment variables

Copy both example files and fill in your credentials:

```bash
cp apps/dashboard/.env.example apps/dashboard/.env.local
cp apps/pwa/.env.example        apps/pwa/.env.local
```

Required variables (same for both apps):

| Variable | Where to find it |
|----------|-----------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase project → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional alias if you already use the anon-key naming |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase project → Settings → API |
| `ANTHROPIC_API_KEY` | console.anthropic.com |
| `RESEND_API_KEY` | resend.com → API Keys |
| `UPSTASH_REDIS_REST_URL` | upstash.com → Redis → REST API |
| `UPSTASH_REDIS_REST_TOKEN` | upstash.com → Redis → REST API |

## 3 — Supabase setup

### Local (recommended for development)

```bash
supabase start                  # starts Postgres, Studio, Auth locally
supabase db reset               # runs all migrations + seed.sql
```

### Seed demo users (first-time only)

The seed.sql has placeholder UUIDs. Run the helper script to create real users:

```bash
node scripts/setup-seed.mjs     # creates auth users, patches seed.sql
supabase db reset               # re-runs with patched seed
```

Demo credentials after seeding:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@demo.co.ke | Demo1234! |
| HR Admin | hr@demo.co.ke | Demo1234! |
| Manager | manager@demo.co.ke | Demo1234! |
| Employee | david@demo.co.ke | Demo1234! |

### Remote project

```bash
supabase link --project-ref <your-project-ref>
supabase db push                # pushes migrations to remote
node scripts/setup-seed.mjs
psql $DATABASE_URL -f supabase/seed.patched.sql
```

## 4 — Generate brand assets

The PWA requires icon PNGs in `apps/pwa/public/icons/`. Generate them with:

```bash
node scripts/generate-icons.mjs
```

This creates (no external dependencies required):
- `apps/pwa/public/icons/icon-192x192.png`
- `apps/pwa/public/icons/icon-512x512.png`
- `apps/dashboard/public/favicon.png`
- `apps/dashboard/public/logo.png`

## 5 — Run in development

```bash
# In separate terminals (or use your IDE's compound launch):
npm run dev --workspace=apps/dashboard   # http://localhost:3000
npm run dev --workspace=apps/pwa         # http://localhost:3001
```

Or with Turborepo (runs both in parallel):

```bash
npx turbo dev
```

## 6 — Run tests

```bash
npm test --workspace=packages/shared
```

## 7 — Deploy to Vercel

Both `apps/dashboard/vercel.json` and `apps/pwa/vercel.json` are configured.

1. Create two Vercel projects (one per app) and connect this repo.
2. Set root directory to `apps/dashboard` (or `apps/pwa`).
3. Add all env vars from step 2 in the Vercel project settings.
4. Push to `main` — Vercel builds automatically.

---

## Payment integrations — Demo Mode

M-Pesa, Airtel Money, and Bank EFT are **simulated** (no real money moves).
The disbursement modal shows a "mock disbursement" notice.
To connect real gateways:
- **M-Pesa / Safaricom Daraja**: replace `apps/dashboard/app/api/payments/mpesa/route.ts`
- **Airtel Money**: replace `apps/dashboard/app/api/payments/airtel/route.ts`
- **Bank EFT**: replace `apps/dashboard/app/api/payments/eft/route.ts`

---

## Tech stack

- **Frontend**: Next.js 14 (App Router), TypeScript strict, Tailwind CSS
- **State**: TanStack Query v5 (server), Zustand v5 (client)
- **Backend**: Supabase (Postgres + Auth + Storage + Realtime + Edge Functions)
- **AI**: Anthropic Claude (`claude-sonnet-4-20250514`) for CV screening
- **Rate limiting**: Upstash Redis (`@upstash/ratelimit`)
- **Email**: Resend via Supabase Edge Function
- **i18n**: English + Swahili (`packages/i18n`)
- **Compliance**: KDPA 2019 — PII encrypted, soft-delete only, 7-year retention
