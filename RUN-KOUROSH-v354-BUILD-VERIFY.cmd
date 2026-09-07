@echo off
setlocal
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Kourosh-v354-FINAL-BUILD-VERIFY.ps1" -ProjectRoot "%CD%"
set RC=%ERRORLEVEL%
echo.
if %RC% EQU 0 (
  echo FINAL BUILD VERIFICATION PASSED.
) else (
  echo FINAL BUILD VERIFICATION FAILED. See release-validation-v354 logs.
)
pause
exit /b %RC%
