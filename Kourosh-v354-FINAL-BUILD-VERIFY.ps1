param(
  [string]$ProjectRoot = (Get-Location).Path
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Invoke-Step {
  param(
    [Parameter(Mandatory=$true)][string]$Name,
    [Parameter(Mandatory=$true)][scriptblock]$Action
  )
  Write-Host "`n=== $Name ===" -ForegroundColor Cyan
  $started = Get-Date
  & $Action
  if ($LASTEXITCODE -ne $null -and $LASTEXITCODE -ne 0) {
    throw "$Name failed with exit code $LASTEXITCODE"
  }
  $elapsed = (Get-Date) - $started
  Write-Host ("PASS: {0} ({1:n1}s)" -f $Name, $elapsed.TotalSeconds) -ForegroundColor Green
}

$root = (Resolve-Path $ProjectRoot).Path
Set-Location $root

if (-not (Test-Path (Join-Path $root 'package.json'))) {
  throw "package.json پیدا نشد. اسکریپت را از ریشه پروژه v354 اجرا کنید."
}
if (-not (Test-Path (Join-Path $root 'KOUROSH_SOURCE_VERSION'))) {
  throw "KOUROSH_SOURCE_VERSION پیدا نشد."
}

$release = (Get-Content (Join-Path $root 'KOUROSH_SOURCE_VERSION') -Raw).Trim()
if ($release -ne 'v354') {
  throw "این verifier مخصوص v354 است؛ نسخه فعلی: $release"
}

$logDir = Join-Path $root 'release-validation-v354'
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$logFile = Join-Path $logDir "build-verify-$stamp.log"
Start-Transcript -Path $logFile -Force | Out-Null

try {
  Write-Host "Kourosh Store Management v354 — Final Build Verification" -ForegroundColor Yellow
  Write-Host "Project: $root"
  Write-Host "Log: $logFile"

  if (-not (Get-Command node -ErrorAction SilentlyContinue)) { throw 'Node.js در PATH نیست.' }
  if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { throw 'npm در PATH نیست.' }

  $nodeVersion = (& node -p "process.versions.node").Trim()
  $npmVersion = (& npm -v).Trim()
  Write-Host "Node: $nodeVersion"
  Write-Host "npm:  $npmVersion"

  if ($nodeVersion -ne '24.11.1') {
    throw "Toolchain mismatch: Node 24.11.1 لازم است، نسخه فعلی $nodeVersion است."
  }
  if ($npmVersion -ne '11.6.2') {
    throw "Toolchain mismatch: npm 11.6.2 لازم است، نسخه فعلی $npmVersion است."
  }

  Invoke-Step 'Clean dependency install (npm ci)' { npm ci }
  Invoke-Step 'Release toolchain audit' { npm run audit:release-toolchain-v339 }
  Invoke-Step 'Full release audit (Stages 1–9 + accounting/UI contracts)' { npm run audit:release }
  Invoke-Step 'MiniApp source gate (65 checks)' { npm run verify:miniapp:source }

  Invoke-Step 'Client typecheck' { npm run typecheck:client }
  Invoke-Step 'MiniApp typecheck' { npm run typecheck:miniapp }
  Invoke-Step 'MiniApp server typecheck' { npm run typecheck:miniapp-server }

  Invoke-Step 'PWA production build' { npm run build }
  Invoke-Step 'MiniApp production build' { npm run build:miniapp }
  Invoke-Step 'MiniApp built artifact verification' { npm run verify:miniapp:built-v267 }
  Invoke-Step 'MiniApp Cloudflare package preparation' { npm run miniapp:cloudflare:prepare-v167 }
  Invoke-Step 'Release identity sync check' { npm run sync:miniapp-release:check }

  $summary = [ordered]@{
    status = 'PASS'
    release = $release
    node = $nodeVersion
    npm = $npmVersion
    verifiedAt = (Get-Date).ToString('o')
    pwaDistExists = (Test-Path (Join-Path $root 'dist'))
    miniappDistExists = (Test-Path (Join-Path $root 'dist-miniapp'))
    cloudflareDistExists = (Test-Path (Join-Path $root 'dist-miniapp-cloudflare'))
    log = $logFile
  }
  $summaryPath = Join-Path $logDir "build-verify-$stamp.json"
  $summary | ConvertTo-Json -Depth 5 | Set-Content -Path $summaryPath -Encoding utf8

  Write-Host "`nFINAL BUILD VERIFICATION: PASS" -ForegroundColor Green
  Write-Host "Summary: $summaryPath"
  Write-Host "Log:     $logFile"
}
catch {
  Write-Host "`nFINAL BUILD VERIFICATION: FAIL" -ForegroundColor Red
  Write-Host $_.Exception.Message -ForegroundColor Red
  Write-Host "Log: $logFile"
  exit 1
}
finally {
  try { Stop-Transcript | Out-Null } catch {}
}
