# UAT Summary — 2026-05-21

Scope: Run interactive UAT checks across Dashboard app (HR Admin view).

Summary:
- Run type: Manual/interactive verification through the live Dashboard UI (headed).
- Environment: https://hr-system-dashboard-sheerlogic.vercel.app (logged-in as HR Admin)
- Playwright artifacts available: `playwright-report/` and `test-results/` (see below)

Tabs tested (status):
- Dashboard: completed — `Workforce Overview` shown; KPIs present but numeric values are zero in this environment.
- Employees: completed — first 10 rows present (sample names: Test UAT Employee, Grace Achieng, Carol Njeri, Henry Mwangi, David Kimani).
- Recruitment: completed — 8 active postings shown; Live Applications feed present.
- Onboarding: completed — shows `6 New Hires (90d)`, `1 Fully Onboarded`, `4 Needs Attention`.
- Leave: completed — 3 pending approvals, 2 approved, 5 total requests; list of requests visible with Approve/Reject buttons.
- Attendance: completed — date set to 21 May 2026; 0 present/absent; no GPS check-ins recorded.
- Payroll: completed — Payroll runs listed; demo notice about simulated disbursements.
- Performance: completed — 5 reviews on record; avg rating 4.4/5.
- Training: completed — 4 sessions; upcoming sessions visible.
- Medical: completed — 4 medical records; one expired certificate warning.
- Reports: completed — headcount, gender split, payroll trend widgets visible.
- Settings: completed — Company profile and Users & Roles sections visible.

Notable test artifacts (open these locally):
- HTML test report: `playwright-report/html/index.html`
- JSON summary: `playwright-report/results.json`
- Failing setup artifacts (connection refused): `test-results/setup-pwa.setup.ts-authenticate-as-employee-David--pwa-setup/`
  - `error-context.md`
  - `test-failed-1.png`
  - `trace.zip`
  - `video.webm`

Failures / Issues observed:
- `tests/setup/pwa.setup.ts` (setup step: authenticate as employee David) previously failed with `net::ERR_CONNECTION_REFUSED` to `http://localhost:3001/login`. Cause: setup script attempted to use a local PWA instance which was not running. Recommendation: set `PWA_BASE_URL` to the live `https://hr-system-pwa.vercel.app` when running the full UAT suite, or start the local PWA dev server on port 3001 prior to running the setup.
- Several KPI values show `0` in this environment — likely because seeded data is limited or environment is isolated.

Next steps / Recommendations:
1. Re-run the full `uat` Playwright project against the live hosts with the following environment variables set (headed, with trace/video):

PowerShell:
```
$env:CAREERS_BASE_URL='https://hr-system-careers.vercel.app'
$env:DASHBOARD_BASE_URL='https://hr-system-dashboard-sheerlogic.vercel.app'
$env:PWA_BASE_URL='https://hr-system-pwa.vercel.app'
$env:NODE_TLS_REJECT_UNAUTHORIZED=0
npx playwright test --project=uat --headed --trace=on --video=on --reporter=html
```

2. If you want to watch tests interactively and step through failures, set `PWDEBUG=1`:

```
$env:PWDEBUG=1
npx playwright test tests/uat/dashboard.spec.ts --project=uat --headed
```

3. To fix the setup failure, either run the PWA locally on port 3001 or update `tests/setup/pwa.setup.ts` to use `process.env.PWA_BASE_URL` for the login URL.

Artifacts captured during this session:
- Playwright report: `playwright-report/html/index.html`
- Test results directory: `test-results/` (see failing setup subfolder above)
- UI screenshots captured interactively (available in the interactive session and saved as session artifacts).

If you want, I can:
- Re-run the entire `uat` suite now against the live hosts and stream the headed browser so you can watch.
- Re-run only the failing setup test with `PWA_BASE_URL` set to the live PWA and capture a fresh trace/video.

— Automated UAT runner (performed interactively by the assistant)
