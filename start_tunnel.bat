@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Kourosh Mini App Tunnel

where node >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js was not found in PATH.
  exit /b 1
)

if not exist "scripts\windows-miniapp-tunnel-launcher.mjs" (
  echo [ERROR] Windows Mini App Tunnel helper is missing.
  exit /b 1
)

echo.
echo ============================================================
echo   KOUROSH MINI APP - OPTIONAL EXTERNAL TUNNEL HELPER
echo ============================================================
echo.
echo [INFO] This helper is optional and does not affect Local Kourosh runtime.
echo [INFO] It exposes only Mini App Gateway 127.0.0.1:4180.
echo.

node scripts\windows-miniapp-tunnel-launcher.mjs
set "RC=%ERRORLEVEL%"

if not "%RC%"=="0" (
  echo.
  echo [ERROR] Mini App Tunnel helper exited with code %RC%.
  echo [INFO] Local Dashboard/PWA can continue without the external tunnel.
  echo.
  pause
)

exit /b %RC%
