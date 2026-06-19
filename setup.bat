@echo off
setlocal
cd /d %~dp0

echo =========================================
echo  Kourosh Local PWA - One-time Setup
echo  (Needs internet only for this step)
echo =========================================
echo.

echo [1/2] Installing dependencies...
call npm i
if errorlevel 1 goto :err


echo.
echo ✅ Setup complete.
echo Now run: start_https.bat
echo.
pause
exit /b 0

:err
echo.
echo ❌ Setup failed. Scroll up to see the error.
pause
exit /b 1
