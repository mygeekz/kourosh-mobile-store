@echo off
setlocal
cd /d "%~dp0"

echo [1/3] Building Telegram Mini App and preparing Cloudflare Worker...
call npm run build:miniapp:cloudflare
if errorlevel 1 exit /b %errorlevel%

if not exist "dist-miniapp\_worker.js" (
  echo [ERROR] dist-miniapp\_worker.js was not prepared.
  exit /b 2
)

echo [2/3] Verifying Cloudflare configuration...
if not exist "deployment\cloudflare-pages\wrangler.toml" (
  echo [ERROR] deployment\cloudflare-pages\wrangler.toml is missing.
  exit /b 3
)

echo [3/3] Deploying to Cloudflare Pages project kourosh...
pushd deployment\cloudflare-pages
call npx wrangler pages deploy ../../dist-miniapp --project-name kourosh
set DEPLOY_EXIT=%errorlevel%
popd

if not "%DEPLOY_EXIT%"=="0" exit /b %DEPLOY_EXIT%
echo.
echo [PASS] Kourosh Mini App deployment completed.
endlocal
