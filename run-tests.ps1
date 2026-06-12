#!/usr/bin/env pwsh
param(
    [string]$command = "test"
)

$ErrorActionPreference = "Continue"
$VerbosePreference = "Continue"

$workdir = "c:\DEV\SHEER LOGIC\CRM + PWA\hr-system"
$logfile = "$workdir\test-run.log"
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

"`n[$timestamp] Starting test run script"  | Tee-Object -FilePath $logfile -Append
"Working directory: $workdir" | Tee-Object -FilePath $logfile -Append
"Command: $command" | Tee-Object -FilePath $logfile -Append

cd $workdir

# Check if dependencies exist
if (!(Test-Path "node_modules/.bin/playwright")) {
    "Installing dependencies..." | Tee-Object -FilePath $logfile -Append
    npm install 2>&1 | Tee-Object -FilePath $logfile -Append
}

# Run tests
"Running: npx playwright test --project=pwa tests/pwa/uat-buttons.spec.ts --reporter=list" | Tee-Object -FilePath $logfile -Append
$env:NODE_TLS_REJECT_UNAUTHORIZED="0"

$output = & npx playwright test --project=pwa tests/pwa/uat-buttons.spec.ts --reporter=list 2>&1
$output | Tee-Object -FilePath $logfile -Append

"Exit code: $LASTEXITCODE" | Tee-Object -FilePath $logfile -Append
"Test run complete at $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" | Tee-Object -FilePath $logfile -Append
