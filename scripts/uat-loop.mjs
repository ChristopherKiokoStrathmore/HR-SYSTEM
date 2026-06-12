#!/usr/bin/env node
// Must be set before any TLS connections (including child process spawns on Windows)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

/**
 * UAT Autonomous Loop
 *
 * Runs Playwright E2E tests, collects failures, calls Claude Code to fix
 * the application (not the tests), then re-runs. Repeats up to MAX_ITERATIONS.
 *
 * Usage:
 *   node scripts/uat-loop.mjs
 *   node scripts/uat-loop.mjs --project=dashboard   # specific project only
 *   node scripts/uat-loop.mjs --max=3               # override iteration limit
 */

import { execSync, spawnSync } from 'child_process'
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const REPORT_DIR = join(ROOT, 'playwright-report')
const RESULTS_FILE = join(REPORT_DIR, 'results.json')
const FAILURES_FILE = join(ROOT, 'UAT_FAILURES.md')

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const projectArg = args.find(a => a.startsWith('--project='))?.split('=')[1]
const maxArg = parseInt(args.find(a => a.startsWith('--max='))?.split('=')[1] ?? '5')
const MAX_ITERATIONS = isNaN(maxArg) ? 5 : maxArg
const HEALER = (process.env.UAT_HEALER ?? 'copilot').toLowerCase()

// ── Helpers ───────────────────────────────────────────────────────────────────

function log(msg) {
  const ts = new Date().toLocaleTimeString()
  console.log(`\n[${ts}] ${msg}`)
}

function runTests({ failedOnly = false } = {}) {
  mkdirSync(REPORT_DIR, { recursive: true })

  const projectFlag = projectArg ? `--project=${projectArg}` : ''
  const failedOnlyFlag = failedOnly ? '--last-failed' : ''
  // Do NOT pass --reporter on the CLI — it overrides playwright.config.ts and breaks the
  // outputFile path for the json reporter. Let the config handle all reporters.
  const cmd = [
    'npx', 'playwright', 'test',
    projectFlag,
    failedOnlyFlag,
  ].filter(Boolean).join(' ')

  log(`Running: ${cmd}`)

  try {
    execSync(cmd, {
      cwd: ROOT,
      stdio: ['ignore', 'inherit', 'inherit'],
      env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
    })
    return true  // exit code 0 — all tests passed
  } catch {
    return false // non-zero exit — at least one test failed
  }
}

function parseResults() {
  if (!existsSync(RESULTS_FILE)) return { passed: 0, failed: 0, skipped: 0, failures: [] }

  const raw = JSON.parse(readFileSync(RESULTS_FILE, 'utf8'))
  const failures = []
  let passed = 0
  let skipped = 0

  for (const suite of raw.suites ?? []) {
    for (const spec of flattenSpecs(suite)) {
      // Playwright JSON: spec.tests[] → each test has test.results[]
      for (const test of spec.tests ?? []) {
        for (const result of test.results ?? []) {
          if (result.status === 'passed') {
            passed++
          } else if (result.status === 'skipped') {
            skipped++
          } else {
            // failed, timedOut, interrupted
            const screenshot = result.attachments?.find(a => a.name === 'screenshot')?.path ?? null
            failures.push({
              title: spec.title,
              file: spec.file,
              line: spec.line,
              error: result.error?.message ?? result.error?.value ?? 'Unknown error',
              stack: result.error?.stack ?? '',
              screenshot,
            })
          }
        }
        // Tests with results:[] were skipped due to a failed dependency (setup project)
        if ((test.results ?? []).length === 0 && test.status === 'skipped') {
          skipped++
        }
      }
    }
  }

  // Also capture stats for a complete picture
  const stats = raw.stats ?? {}
  const totalUnexpected = stats.unexpected ?? failures.length
  const totalSkipped = stats.skipped ?? skipped

  return { passed, failed: failures.length, skipped: totalSkipped, unexpected: totalUnexpected, failures }
}

function flattenSpecs(suite, results = []) {
  for (const spec of suite.specs ?? []) results.push({ ...spec, file: suite.file ?? spec.file })
  for (const child of suite.suites ?? []) flattenSpecs(child, results)
  return results
}

function writeFailureReport(iteration, results) {
  const { passed, failed, failures } = results

  const lines = [
    `# UAT Failure Report — Iteration ${iteration}`,
    ``,
    `**Date:** ${new Date().toISOString()}`,
    `**Passed:** ${passed}   **Failed:** ${failed}`,
    ``,
    `## Context`,
    ``,
    `This is the Sheer Logic HR system — a Turborepo monorepo with:`,
    `- Dashboard app: \`apps/dashboard\` (Next.js 14, port 3000) — HR admin panel`,
    `- PWA app: \`apps/pwa\` (Next.js 14, port 3001) — Employee mobile portal`,
    `- Shared packages: \`packages/shared\`, \`packages/i18n\``,
    `- Backend: Supabase (remote) with service-role and SSR cookie clients`,
    ``,
    `**IMPORTANT RULES FOR FIXES:**`,
    `- Fix application source code ONLY (in \`apps/\` and \`packages/\`)`,
    `- NEVER modify files in the \`tests/\` directory`,
    `- After making fixes, do NOT run tests — the loop runner handles that`,
    ``,
    `## Failing Tests`,
    ``,
  ]

  failures.forEach((f, i) => {
    lines.push(`### ${i + 1}. ${f.title}`)
    lines.push(``)
    lines.push(`**Test file:** \`${f.file}:${f.line}\``)
    lines.push(``)
    lines.push(`**Error:**`)
    lines.push('```')
    lines.push(f.error.slice(0, 1500))
    lines.push('```')
    if (f.stack) {
      lines.push(``)
      lines.push(`**Stack (truncated):**`)
      lines.push('```')
      lines.push(f.stack.split('\n').slice(0, 8).join('\n'))
      lines.push('```')
    }
    if (f.screenshot) {
      lines.push(``)
      lines.push(`**Screenshot:** \`${f.screenshot}\``)
    }
    lines.push(``)
  })

  lines.push(`## What to do`)
  lines.push(``)
  lines.push(`1. Read each failing test file listed above to understand what the test expects`)
  lines.push(`2. Read the relevant application source files to identify the root cause`)
  lines.push(`3. Make the minimum necessary changes to \`apps/\` or \`packages/\` to fix the issue`)
  lines.push(`4. Common root causes to check:`)
  lines.push(`   - API routes returning wrong status codes or missing data`)
  lines.push(`   - Components using wrong selectors or aria labels`)
  lines.push(`   - Missing \`activeCompanyId\` (check \`apps/dashboard/app/providers.tsx\`)`)
  lines.push(`   - Auth not being passed correctly in API routes`)
  lines.push(`   - Wrong URL paths (dashboard uses route group \`(dashboard)\` — no prefix in URL)`)

  writeFileSync(FAILURES_FILE, lines.join('\n'))
  log(`Failure report written to UAT_FAILURES.md`)
}

function invokeHealerToFix(iteration) {
  log(`Invoking ${HEALER} fixer to heal failures (iteration ${iteration})...`)

  const prompt = [
    `Read UAT_FAILURES.md in the project root for full context on what's failing.`,
    `Then read the test spec files mentioned in the report to understand what each test expects.`,
    `Then read the relevant application source files and fix the bugs.`,
    ``,
    `Do NOT modify any files inside the tests/ directory.`,
    `Do NOT run tests yourself.`,
    `Make targeted, minimal fixes to make the failing scenarios work.`,
  ].join(' ')

  const providers = HEALER === 'claude'
    ? [
        { name: 'claude', cmd: 'claude', args: ['-p', prompt] },
        { name: 'copilot', cmd: 'copilot', args: ['-p', prompt] },
      ]
    : [
        { name: 'copilot', cmd: 'copilot', args: ['-p', prompt] },
        { name: 'claude', cmd: 'claude', args: ['-p', prompt] },
      ]

  for (const provider of providers) {
    const res = spawnSync(provider.cmd, provider.args, {
      cwd: ROOT,
      env: { ...process.env, NODE_TLS_REJECT_UNAUTHORIZED: '0' },
      encoding: 'utf8',
      timeout: 180_000,
      input: 'n\n',
      shell: true,
    })

    if (res.error?.code === 'ENOENT') {
      log(`'${provider.cmd}' not found in PATH, trying next provider...`)
      continue
    }

    const combined = `${res.stdout ?? ''}\n${res.stderr ?? ''}`
    if (combined.trim()) process.stdout.write(combined)

    if (combined.includes('Cannot find GitHub Copilot CLI')) {
      log(`GitHub Copilot CLI is not installed, trying next provider...`)
      continue
    }

    if (res.status === 0) {
      log(`${provider.name} finished making fixes.`)
      return true
    }

    // Some CLIs return non-zero after edits; keep going with the loop regardless.
    log(`${provider.name} exited with status ${res.status ?? 'unknown'} — continuing with next test iteration.`)
    return true
  }

  log(`No fixer CLI available (tried: ${providers.map(p => p.cmd).join(', ')}).`)
  log(`Install GitHub Copilot CLI: https://docs.github.com/en/copilot/how-tos/set-up/install-copilot-cli`)
  log(`Or install Claude Code CLI: https://claude.ai/code`)
  return false
}

// ── Main loop ─────────────────────────────────────────────────────────────────

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════╗
║          Sheer Logic HR — Autonomous UAT          ║
║   Playwright + Copilot/Claude self-healing loop   ║
╠═══════════════════════════════════════════════════╣
║  Max iterations : ${String(MAX_ITERATIONS).padEnd(30)}║
║  Project filter : ${(projectArg ?? 'all').padEnd(30)}║
╚═══════════════════════════════════════════════════╝
  `)

  log('Checking that dev servers are reachable...')
  for (const [name, url] of [['Dashboard', 'http://localhost:3000'], ['PWA', 'http://localhost:3001']]) {
    try {
      execSync(`curl -sfo /dev/null --connect-timeout 3 ${url}`, { stdio: 'ignore' })
      log(`✓ ${name} at ${url}`)
    } catch {
      console.warn(`  ⚠ ${name} at ${url} not reachable — start the dev servers first with: npm run dev`)
    }
  }

  for (let i = 1; i <= MAX_ITERATIONS; i++) {
    log(`══════════════════════════════`)
    log(`  ITERATION ${i} / ${MAX_ITERATIONS}`)
    log(`══════════════════════════════`)

    // Phase 1: full suite
    const allPassed = runTests({ failedOnly: false })
    const results = parseResults()

    const displayFailed = results.unexpected ?? results.failed
    log(`Results: ${results.passed} passed, ${displayFailed} failed/unexpected, ${results.skipped ?? 0} skipped`)

    if (allPassed) {
      console.log(`
╔═══════════════════════════════════════╗
║   ✅  All UAT tests passing!          ║
║   ${String(results.passed + ' tests passed in ' + i + ' iteration(s)').padEnd(38)}║
╚═══════════════════════════════════════╝`)
      process.exit(0)
    }

    writeFailureReport(i, results)

    const healed = invokeHealerToFix(i)
    if (!healed) {
      console.log(`\nPausing loop: no auto-healer CLI is runnable in this environment.`)
      console.log(`Fix the failing issues manually, then rerun UAT.`)
      process.exit(1)
    }

    log(`Running failed tests only to validate fixes before re-running full suite...`)
    const failedOnlyPassed = runTests({ failedOnly: true })
    const focusedResults = parseResults()
    const focusedFailed = focusedResults.unexpected ?? focusedResults.failed
    log(`Focused rerun: ${focusedResults.passed} passed, ${focusedFailed} failed/unexpected, ${focusedResults.skipped ?? 0} skipped`)

    if (!failedOnlyPassed) {
      if (i === MAX_ITERATIONS) {
        writeFailureReport(i, focusedResults)
        console.log(`
╔═══════════════════════════════════════╗
║   ❌  Max iterations reached          ║
║   ${String(focusedFailed + ' test(s) still failing').padEnd(38)}║
╚═══════════════════════════════════════╝`)
        console.log(`\nSee UAT_FAILURES.md and playwright-report/html/index.html for details.`)
        process.exit(1)
      }

      writeFailureReport(i, focusedResults)
      log(`Waiting 5 seconds for file changes to settle before next heal attempt...`)
      await new Promise(r => setTimeout(r, 5_000))
      continue
    }

    log(`Focused rerun passed. Running full confirmation suite...`)
    const confirmPassed = runTests({ failedOnly: false })
    const confirmResults = parseResults()
    const confirmFailed = confirmResults.unexpected ?? confirmResults.failed
    log(`Confirmation run: ${confirmResults.passed} passed, ${confirmFailed} failed/unexpected, ${confirmResults.skipped ?? 0} skipped`)

    if (confirmPassed) {
      console.log(`
╔═══════════════════════════════════════╗
║   ✅  All UAT tests passing!          ║
║   ${String(confirmResults.passed + ' tests passed in ' + i + ' iteration(s)').padEnd(38)}║
╚═══════════════════════════════════════╝`)
      process.exit(0)
    }

    if (i === MAX_ITERATIONS) {
      writeFailureReport(i, confirmResults)
      console.log(`
╔═══════════════════════════════════════╗
║   ❌  Max iterations reached          ║
║   ${String(confirmFailed + ' test(s) still failing').padEnd(38)}║
╚═══════════════════════════════════════╝`)
      console.log(`\nSee UAT_FAILURES.md and playwright-report/html/index.html for details.`)
      process.exit(1)
    }

    writeFailureReport(i, confirmResults)

    log(`Waiting 5 seconds for file changes to settle before re-running...`)
    await new Promise(r => setTimeout(r, 5_000))
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
