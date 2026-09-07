@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d %~dp0

:: Auto-elevate for binding port 80
net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo Requesting Administrator privileges for the local proxy...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

set "KOUROSH_DEV_PROXY=1"
set "VITE_DISABLE_HTTPS=1"
set "VITE_ENABLE_PWA_DEV=0"
set "KOUROSH_PROXY_PORT=80"
set "KOUROSH_VITE_PORT=5173"
set "KOUROSH_API_PORT=3001"
set "KOUROSH_VITE_HOST=127.0.0.1"
set "KOUROSH_API_HOST=127.0.0.1"
set "VITE_PUBLIC_PORT=80"
set "VITE_PUBLIC_PROTOCOL=http"

for /f "delims=" %%I in ('powershell -NoProfile -Command "try { (Get-NetIPAddress -AddressFamily IPv4 ^| Where-Object { $_.IPAddress -notmatch '^127\\.' -and $_.IPAddress -notmatch '^169\\.254\\.' -and $_.InterfaceAlias -notmatch 'Loopback|Virtual' } ^| Select-Object -First 1 -ExpandProperty IPAddress) } catch { '' }"') do set "LAN_IP=%%I"
if not defined LAN_IP set "LAN_IP=127.0.0.1"

set "PUBLIC_HOST=%LAN_IP%"
set "KOUROSH_LOCAL_DOMAIN=%LAN_IP%"
set "VITE_PUBLIC_HOST=%LAN_IP%"
set "KOUROSH_PUBLIC_URL=http://%PUBLIC_HOST%"

cls
 echo ===============================================
 echo Kourosh Local Dev Proxy
 echo ===============================================
 echo Proxy URL : http://%PUBLIC_HOST%/
 echo LAN IP    : http://%LAN_IP%/
 echo Vite      : http://127.0.0.1:5173
 echo API       : http://127.0.0.1:3001
 echo.
 echo If you use a custom domain, make sure hosts points it to %LAN_IP%.
 echo.
 echo Starting backend + Vite + reverse proxy...
 echo.

call npm run dev:proxy
endlocal
