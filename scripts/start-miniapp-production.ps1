param([switch]$VerifyOnly)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDir = Join-Path $env:LOCALAPPDATA 'Kourosh\miniapp-startup'
New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
$nodeExe = (Get-Command node.exe -ErrorAction Stop).Source
$result = [ordered]@{ checkedAt = [DateTime]::UtcNow.ToString('o'); bootTime = (Get-CimInstance Win32_OperatingSystem).LastBootUpTime.ToUniversalTime().ToString('o'); api = 'pending'; gateway = 'pending'; tunnel = 'unknown' }
try {
  foreach ($entry in @(
    @{ name = 'api'; port = 3001; script = 'server\index.ts'; arguments = '--import tsx server/index.ts' },
    @{ name = 'gateway'; port = 4180; script = 'scripts\serve-miniapp-gateway.mjs'; arguments = 'scripts/serve-miniapp-gateway.mjs' }
  )) {
    $listener = Get-NetTCPConnection -State Listen -LocalPort $entry.port -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($listener) {
      $owner = Get-CimInstance Win32_Process -Filter "ProcessId=$($listener.OwningProcess)"
      $expected = $entry.script.Replace('\','/')
      if (-not $owner.CommandLine -or $owner.CommandLine.Replace('\','/') -notlike "*$expected*") { throw 'Port owned by an unrecognized process; nothing stopped.' }
      $result[$entry.name] = 'already-listening'
      continue
    }
    if ($VerifyOnly) { $result[$entry.name] = 'not-listening'; continue }
    # Refuse to start duplicate API/polling runtimes while initialization is in progress.
    $expected = $entry.script.Replace('\','/')
    $initializing = Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Replace('\','/') -like "*$expected*" }
    if (-not $initializing) {
      Start-Process -FilePath $nodeExe -ArgumentList $entry.arguments -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDir "$($entry.name).stdout.log") -RedirectStandardError (Join-Path $runtimeDir "$($entry.name).stderr.log") | Out-Null
    }
    $deadline = [DateTime]::UtcNow.AddMinutes(10)
    do {
      $listener = Get-NetTCPConnection -State Listen -LocalPort $entry.port -ErrorAction SilentlyContinue | Select-Object -First 1
      if ($listener) { break }
      Start-Sleep -Seconds 5
    } while ([DateTime]::UtcNow -lt $deadline)
    if (-not $listener) { throw 'Runtime did not begin listening within ten minutes.' }
    $result[$entry.name] = 'listening'
  }
  $result.tunnel = [string](Get-Service Cloudflared).Status
  $result.completed = $result.api -ne 'not-listening' -and $result.gateway -ne 'not-listening' -and $result.tunnel -eq 'Running'
} catch {
  # Do not serialize raw exceptions, process command lines, environment or credentials.
  $result.completed = $false
  $result.error = 'STARTUP_CHECK_FAILED'
} finally {
  $result | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtimeDir 'startup-result.json') -Encoding UTF8
}
if (-not $result.completed) { exit 1 }
