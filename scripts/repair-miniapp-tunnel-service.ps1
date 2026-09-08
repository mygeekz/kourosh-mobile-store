param(
  [string]$ResultPath = "$env:TEMP\kourosh-tunnel-service-repair.json"
)
$ErrorActionPreference = 'Stop'
try {
  $principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
  if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Administrator privileges are required to repair the existing Windows service.'
  }
  $servicePath = 'HKLM:\SYSTEM\CurrentControlSet\Services\Cloudflared'
  $current = Get-ItemProperty -LiteralPath $servicePath
  $executable = 'C:\Program Files (x86)\cloudflared\cloudflared.exe'
  $tokenPath = 'C:\ProgramData\cloudflared\token'
  if (-not (Test-Path -LiteralPath $executable)) { throw 'Existing cloudflared executable is missing.' }
  if ($current.ImagePath -notlike "*$executable*" -or $current.ImagePath -notlike "*--token-file $tokenPath*") {
    throw 'Service configuration differs from the inspected Mini App service; refusing to overwrite it.'
  }
  # Read only to verify the existing tunnel identity. Never print or rewrite the token.
  $tokenPayload = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String((Get-Content -LiteralPath $tokenPath -Raw).Trim())) | ConvertFrom-Json
  if ($tokenPayload.t -ne '82751cde-df7f-43e0-bd9f-bb900bd0433d') {
    throw 'The service token belongs to a different tunnel; no changes made.'
  }
  $command = '"' + $executable + '" tunnel --protocol http2 --edge-ip-version 4 run --token-file ' + $tokenPath
  Set-ItemProperty -LiteralPath $servicePath -Name ImagePath -Value $command
  Set-Service -Name Cloudflared -StartupType Automatic
  Restart-Service -Name Cloudflared
  (Get-Service Cloudflared).WaitForStatus('Running', [TimeSpan]::FromSeconds(20))
  @{ success = $true; service = 'Cloudflared'; protocol = 'http2'; credentialsChanged = $false } |
    ConvertTo-Json | Set-Content -LiteralPath $ResultPath -Encoding UTF8
} catch {
  @{ success = $false; message = $_.Exception.Message } |
    ConvertTo-Json | Set-Content -LiteralPath $ResultPath -Encoding UTF8
  exit 1
}
