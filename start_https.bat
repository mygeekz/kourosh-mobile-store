@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

for /f %%a in ('echo prompt $E ^| cmd') do set "ESC=%%a"

reg query "HKCU\Console" /v VirtualTerminalLevel >nul 2>&1
if errorlevel 1 reg add "HKCU\Console" /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul

title Kourosh Local PWA - HTTPS Production Runtime

where node >nul 2>&1
if errorlevel 1 (
  echo [RUNTIME ERROR] Node.js was not found in PATH.
  exit /b 1
)
set "NODE_EXE="
for /f "delims=" %%N in ('where node') do (
  if not defined NODE_EXE set "NODE_EXE=%%N"
)
if not defined NODE_EXE (
  echo [RUNTIME ERROR] Node.js executable path could not be resolved.
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [RUNTIME ERROR] npm was not found in PATH.
  exit /b 1
)

:: One shared Node detector selects the active physical LAN adapter. A manual
:: KOUROSH_HTTPS_HOST=192.168.1.10 override is still supported, but loopback,
:: link-local and stale inherited LOCAL_HOSTS_IP values are never published as LAN.
for /f "delims=" %%I in ('node --import tsx scripts/print-local-lan-ip.ts') do set "LAN_IP=%%I"
if not defined LAN_IP (
  echo.
  <nul set /p="!ESC![91m[NETWORK ERROR] No usable Wi-Fi or Ethernet IPv4 address was found.!ESC![0m"&echo.
  <nul set /p="!ESC![93mConnect this computer to the same network as the phone, then run start_https.bat again.!ESC![0m"&echo.
  echo.
  pause
  exit /b 1
)

:: Direct HTTPS mode. Do not start the HTTP reverse proxy on port 80.
set "KOUROSH_DEV_PROXY="
set "VITE_DISABLE_HTTPS=0"
set "VITE_ENABLE_PWA_DEV=0"
:: Never pin Vite asset URLs to one hostname. The same server may be opened
:: through the LAN IP, localhost, 127.0.0.1 or a future local DNS name.
set "VITE_PUBLIC_HOST="
set "VITE_PUBLIC_PORT=5173"
set "VITE_PUBLIC_PROTOCOL="
set "KOUROSH_PUBLIC_HOST="
set "KOUROSH_PUBLIC_PORT="
set "KOUROSH_REDIRECT_HTTP_PORT=80"
set "KOUROSH_REDIRECT_HTTPS_PORT=443"
set "KOUROSH_PWA_HOST=0.0.0.0"
set "KOUROSH_PWA_PORT=5173"
set "LOCAL_HOSTS_IP=%LAN_IP%"
:: Ignore stale certificate-file overrides inherited from Windows or an older
:: development setup. Production HTTPS must serve the exact certificate that
:: https:bootstrap validates for LAN_IP.
set "KOUROSH_ALLOW_EXTERNAL_TLS_FILES=0"
set "HTTPS_PFX_FILE="
set "HTTPS_CERT_FILE="
set "HTTPS_KEY_FILE="
set "VITE_HTTPS_PFX_FILE="
set "VITE_HTTPS_CERT_FILE="
set "VITE_HTTPS_KEY_FILE="

set "S=                                        "

<nul set /p="!ESC![32m%S%=============================================!ESC![0m"&echo.
<nul set /p="!ESC![31m%S%KOUROSH LOCAL PWA - START (HTTPS)!ESC![0m"&echo.
<nul set /p="!ESC![32m%S%=============================================!ESC![0m"&echo.
echo.

<nul set /p="!ESC![33m%S%[INFO] Preparing installable production PWA and starting HTTPS runtime...!ESC![0m"&echo.
<nul set /p="!ESC![33m%S%[ACCESS] https://%LAN_IP%:5173/#/!ESC![0m"&echo.
<nul set /p="!ESC![33m%S%[ROOT CA] https://%LAN_IP%:5173/api/local-runtime/root-ca.crt!ESC![0m"&echo.
<nul set /p="!ESC![33m%S%[BACKEND] http://127.0.0.1:3001 via same-origin HTTPS /api proxy!ESC![0m"&echo.
<nul set /p="!ESC![36m%S%[SHORTCUT] After hosts setup: ^<hostname^>.local redirects to the configured HTTPS domain.!ESC![0m"&echo.
<nul set /p="!ESC![36m%S%[REDIRECT] Standard ports 80/443 are reserved for automatic no-port redirect.!ESC![0m"&echo.
echo.

<nul set /p="!ESC![32m%S%[CERTIFICATE] Root CA, LAN IP SAN, trust and expiry are checked automatically before startup.!ESC![0m"&echo.
<nul set /p="!ESC![36m%S%[PHONE] Install the Root CA as a CA certificate, fully close Chrome, then reopen ACCESS.!ESC![0m"&echo.
<nul set /p="!ESC![31m%S%Do not close this window while the application is running.!ESC![0m"&echo.
echo.

<nul set /p="!ESC![33m%S%[MINI APP] Scheduling Mini App bundle/Gateway/Tunnel independently after Local Backend readiness...!ESC![0m"&echo.
<nul set /p="!ESC![36m%S%[STARTUP] Local Kourosh does not wait for Mini App build, Tunnel or Cloud connectivity.!ESC![0m"&echo.
:: Start the Mini App coordinator in its own visible console. Do NOT use /B:
:: /B attaches the child to this console and prevents the second CMD window.
:: Resolve node.exe explicitly so Windows START does not depend on command-name parsing.
cmd /c exit /b 0
start "KOUROSH MINI APP" /D "%~dp0" "!NODE_EXE!" "scripts\windows-miniapp-startup-coordinator.mjs"
if errorlevel 1 (
  <nul set /p="!ESC![93m%S%[MINI APP WARNING] Could not open the Mini App console. Local Dashboard/PWA will still start.!ESC![0m"&echo.
) else (
  <nul set /p="!ESC![32m%S%[MINI APP] Mini App console launched. It will wait for Backend readiness automatically.!ESC![0m"&echo.
)

<nul set /p="!ESC![36m%S%Developer : Behzad Halili!ESC![0m"&echo.
<nul set /p="!ESC![36m%S%Support   : 09361583838!ESC![0m"&echo.
echo.

call npm run start:https
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if "%EXIT_CODE%"=="0" (
  <nul set /p="!ESC![33m%S%[STOPPED] Server stopped normally.!ESC![0m"&echo.
) else (
  <nul set /p="!ESC![91m%S%[ERROR] HTTPS server stopped with code %EXIT_CODE%.!ESC![0m"&echo.
)
pause
exit /b %EXIT_CODE%
