@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Kourosh Local Domain Setup

set "HOST=kourosh.localhost"
set "IP=127.0.0.1"
set "HOSTS=%SystemRoot%\System32\drivers\etc\hosts"

net session >nul 2>&1
if not "%errorlevel%"=="0" (
  echo Requesting Administrator privileges...
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

if not exist "%HOSTS%" (
  echo Hosts file was not found.
  pause
  exit /b 1
)

set "TMP=%TEMP%hosts-%RANDOM%.tmp"
break > "%TMP%"
for /f "usebackq delims=" %%L in ("%HOSTS%") do (
  set "LINE=%%L"
  echo(!LINE! | findstr /I /C:" %HOST%" /C:"%HOST%" >nul
  if errorlevel 1 (
    >> "%TMP%" echo(!LINE!
  )
)

>> "%TMP%" echo %IP% %HOST%
copy /Y "%TMP%" "%HOSTS%" >nul
del "%TMP%" >nul 2>&1
ipconfig /flushdns >nul

echo.
echo ======================================
echo Domain configured successfully:
echo https://%HOST%
echo Hosts entry:
echo %IP% %HOST%
echo ======================================
pause
