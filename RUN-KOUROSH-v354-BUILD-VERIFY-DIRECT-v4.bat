@echo off
setlocal EnableExtensions
cd /d "%~dp0"

echo Kourosh Store Management v354 - Build Verification
echo Project root: %CD%
echo.

if not exist package.json (
  echo [FAIL] package.json not found. Put this file in the project root.
  pause
  exit /b 1
)
if not exist KOUROSH_SOURCE_VERSION (
  echo [FAIL] KOUROSH_SOURCE_VERSION not found.
  pause
  exit /b 1
)

set /p RELEASE=<KOUROSH_SOURCE_VERSION
if /I not "%RELEASE%"=="v354" (
  echo [FAIL] This verifier is for v354. Current: %RELEASE%
  pause
  exit /b 1
)

where node >nul 2>&1
if errorlevel 1 (
  echo [FAIL] Node.js is not available in PATH.
  pause
  exit /b 1
)
where npm >nul 2>&1
if errorlevel 1 (
  echo [FAIL] npm is not available in PATH.
  pause
  exit /b 1
)

for /f "delims=" %%V in ('node -p "process.versions.node"') do set NODE_VER=%%V
for /f "delims=" %%V in ('npm -v') do set NPM_VER=%%V
echo Node: %NODE_VER%
echo npm : %NPM_VER%
echo.

node -e "const [M,m,p]=process.versions.node.split('.').map(Number); const ok=(M===22 && (m>17 || (m===17 && p>=0))) || M>=24; if(!ok){console.error('[FAIL] package.json requires Node ^22.17.0 or >=24.0.0; current:',process.versions.node);process.exit(1)}; console.log('[PASS] Node satisfies project engines (^22.17.0 || >=24.0.0).')"
if errorlevel 1 (
  pause
  exit /b 1
)

node -e "const v='%NPM_VER%'.split('.').map(Number); const [M,m,p]=v; const ok=(M===10 && (m>9 || (m===9 && p>=2))) || M===11; if(!ok){console.error('[FAIL] package.json requires npm >=10.9.2 <12; current:','%NPM_VER%');process.exit(1)}; console.log('[PASS] npm satisfies project engines (>=10.9.2 <12).')"
if errorlevel 1 (
  pause
  exit /b 1
)

echo [INFO] .nvmrc / .npm-version pins are CI reproducibility pins only.
echo [INFO] Active Node/npm may be newer as long as package.json engines are satisfied.
echo.

call npm ci
if errorlevel 1 (
  echo [FAIL] npm ci
  pause
  exit /b 1
)

call npm run audit:release-toolchain-v339
if errorlevel 1 (
  echo [FAIL] release toolchain audit
  pause
  exit /b 1
)

call npm run audit:release
if errorlevel 1 (
  echo [FAIL] full release audit
  pause
  exit /b 1
)

call npm run verify:miniapp:source
if errorlevel 1 (
  echo [FAIL] MiniApp source gate
  pause
  exit /b 1
)

call npm run typecheck:client
if errorlevel 1 (
  echo [FAIL] client typecheck
  pause
  exit /b 1
)

call npm run typecheck:miniapp
if errorlevel 1 (
  echo [FAIL] MiniApp typecheck
  pause
  exit /b 1
)

call npm run typecheck:miniapp-server
if errorlevel 1 (
  echo [FAIL] MiniApp server typecheck
  pause
  exit /b 1
)

call npm run build
if errorlevel 1 (
  echo [FAIL] PWA production build
  pause
  exit /b 1
)

call npm run build:miniapp
if errorlevel 1 (
  echo [FAIL] MiniApp production build
  pause
  exit /b 1
)

call npm run verify:miniapp:built-v267
if errorlevel 1 (
  echo [FAIL] MiniApp built artifact verification
  pause
  exit /b 1
)

call npm run miniapp:cloudflare:prepare-v167
if errorlevel 1 (
  echo [FAIL] Cloudflare package preparation
  pause
  exit /b 1
)

call npm run sync:miniapp-release:check
if errorlevel 1 (
  echo [FAIL] release identity sync check
  pause
  exit /b 1
)

echo.
echo ================================================
echo FINAL BUILD VERIFICATION: PASS
echo Node: %NODE_VER%
echo npm : %NPM_VER%
echo ================================================
pause
exit /b 0
