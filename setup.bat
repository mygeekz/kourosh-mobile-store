@echo off
setlocal
cd /d %~dp0

echo =========================================
echo  Kourosh Local PWA - One-time Setup
echo  Exact locked dependencies with reviewed install scripts
echo =========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [setup] ERROR: Node.js was not found.
  echo Install Node.js 22.17.0 or newer, then run setup.bat again.
  goto :err
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [setup] ERROR: npm was not found.
  echo Reinstall Node.js 22.17.0 or newer, then run setup.bat again.
  goto :err
)

echo [1/8] Verifying Node, npm, package-lock and install-script policy...
node scripts\verify-install-environment.mjs
if errorlevel 1 goto :err

echo.
echo [2/8] Synchronizing reviewed ExcelJS, Router, PWA, Recharts, source-map and isolated glob dependencies...
node scripts\prepare-reviewed-dependency-chain.mjs
if errorlevel 1 goto :err

echo.
echo [3/8] Installing exact dependencies from package-lock.json...
call npm ci --no-fund
if errorlevel 1 goto :err

echo.
echo [4/8] Verifying ExcelJS XLSX, CSV, ZIP and archiver glob compatibility...
node scripts\test-exceljs-compatibility.mjs
if errorlevel 1 goto :err

echo.
echo [5/8] Verifying Router, HTTPS/PWA runtime, Recharts, source-map and isolated glob package compatibility...
node scripts\audit-recharts-v3-migration.mjs
if errorlevel 1 goto :err
node scripts\test-reviewed-package-compatibility.mjs
if errorlevel 1 goto :err
node scripts\audit-https-dev-origin.mjs
if errorlevel 1 goto :err
node scripts\audit-local-certificate-runtime.mjs
if errorlevel 1 goto :err
node scripts\audit-pwa-install-runtime.mjs
if errorlevel 1 goto :err
node scripts\test-local-pwa-server-runtime.mjs
if errorlevel 1 goto :err
node scripts\audit-database-restore-lifecycle.mjs
if errorlevel 1 goto :err

echo.
echo [6/8] Verifying production build with reviewed Router, PWA, Recharts, source-map and isolated glob packages...
node scripts\run-production-build-strict.mjs
if errorlevel 1 goto :err

echo.
echo [7/8] Preparing and validating the local Root CA and HTTPS server certificate...
call npm run https:bootstrap
if errorlevel 1 goto :err
call npm run test:local-pwa-https-runtime
if errorlevel 1 goto :err

echo.
echo [8/8] Verifying native SQLite binding...
node -e "require('sqlite3'); console.log('[setup] sqlite3 native binding OK')"
if errorlevel 1 goto :err

echo.
echo Setup complete.
echo Now run: start_https.bat
echo.
pause
exit /b 0

:err
echo.
echo Setup failed. Scroll up to see the first ERROR line.
pause
exit /b 1
