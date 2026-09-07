@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Kourosh v354 Final Build Verification

cls
echo ============================================================
echo   Kourosh Store Management v354 - Final Build Verification
echo ============================================================
echo.

echo Project root: %CD%
echo.

if not exist "package.json" (
  echo [FAIL] package.json not found.
  echo Extract this BAT into the ROOT of the v354 project and run it there.
  goto :fail
)

if not exist "KOUROSH_SOURCE_VERSION" (
  echo [FAIL] KOUROSH_SOURCE_VERSION not found.
  goto :fail
)

set /p RELEASE=<KOUROSH_SOURCE_VERSION
if /I not "%RELEASE%"=="v354" (
  echo [FAIL] This verifier is for v354. Current version: %RELEASE%
  goto :fail
)

where node >nul 2>&1
if errorlevel 1 (
  echo [FAIL] Node.js is not available in PATH.
  goto :fail
)

where npm >nul 2>&1
if errorlevel 1 (
  echo [FAIL] npm is not available in PATH.
  goto :fail
)

for /f "delims=" %%V in ('node -p "process.versions.node"') do set NODEVER=%%V
for /f "delims=" %%V in ('npm -v') do set NPMVER=%%V

echo Node: %NODEVER%
echo npm : %NPMVER%
echo.

if not "%NODEVER%"=="24.11.1" (
  echo [FAIL] Node 24.11.1 is required. Current: %NODEVER%
  goto :fail
)

if not "%NPMVER%"=="11.6.2" (
  echo [FAIL] npm 11.6.2 is required. Current: %NPMVER%
  goto :fail
)

call :step "Clean dependency install" npm ci
if errorlevel 1 goto :fail

call :step "Release toolchain audit" npm run audit:release-toolchain-v339
if errorlevel 1 goto :fail

call :step "Full release audit" npm run audit:release
if errorlevel 1 goto :fail

call :step "MiniApp source gate - 65 checks" npm run verify:miniapp:source
if errorlevel 1 goto :fail

call :step "Client typecheck" npm run typecheck:client
if errorlevel 1 goto :fail

call :step "MiniApp typecheck" npm run typecheck:miniapp
if errorlevel 1 goto :fail

call :step "MiniApp server typecheck" npm run typecheck:miniapp-server
if errorlevel 1 goto :fail

call :step "PWA production build" npm run build
if errorlevel 1 goto :fail

call :step "MiniApp production build" npm run build:miniapp
if errorlevel 1 goto :fail

call :step "MiniApp built artifact verification" npm run verify:miniapp:built-v267
if errorlevel 1 goto :fail

call :step "Cloudflare package preparation" npm run miniapp:cloudflare:prepare-v167
if errorlevel 1 goto :fail

call :step "Release identity sync check" npm run sync:miniapp-release:check
if errorlevel 1 goto :fail

echo.
echo ============================================================
echo   FINAL BUILD VERIFICATION: PASS
echo ============================================================
echo.
echo dist                :
if exist "dist" (echo   FOUND) else (echo   NOT FOUND)
echo dist-miniapp        :
if exist "dist-miniapp" (echo   FOUND) else (echo   NOT FOUND)
echo dist-miniapp-cloudflare:
if exist "dist-miniapp-cloudflare" (echo   FOUND) else (echo   NOT FOUND)
echo.
pause
exit /b 0

:step
set "STEPNAME=%~1"
shift
echo.
echo ------------------------------------------------------------
echo [RUN] %STEPNAME%
echo ------------------------------------------------------------
call %*
set "RC=%ERRORLEVEL%"
if not "%RC%"=="0" (
  echo.
  echo [FAIL] %STEPNAME% ^(exit code %RC%^)
  exit /b %RC%
)
echo [PASS] %STEPNAME%
exit /b 0

:fail
echo.
echo ============================================================
echo   FINAL BUILD VERIFICATION: FAIL
echo ============================================================
echo.
echo Fix the error shown above, then run this BAT again.
echo.
pause
exit /b 1
