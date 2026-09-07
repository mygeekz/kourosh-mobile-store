@echo off
setlocal EnableExtensions EnableDelayedExpansion
title Kourosh Local Domain Setup

set "PRIMARY_HOST=kourosh.home.arpa"
set "SHORT_HOST=kourosh.home.arpa"
set "IP=192.168.1.110"
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

set "TMP=%TEMP%\hosts-%RANDOM%.tmp"
break > "%TMP%"
for /f "usebackq delims=" %%L in ("%HOSTS%") do (
  set "LINE=%%L"
  echo(!LINE! | findstr /I /C:" kourosh.home.arpa" /C:"kourosh.home.arpa " /C:"kourosh.home.arpa" >nul
  if errorlevel 1 (
    >> "%TMP%" echo(!LINE!
  )
)

>> "%TMP%" echo 192.168.1.110 kourosh.home.arpa
copy /Y "%TMP%" "%HOSTS%" >nul
del "%TMP%" >nul 2>&1
ipconfig /flushdns >nul

echo.
echo ======================================
echo Local domains configured successfully:
echo Shortcut: http://%SHORT_HOST%
echo Target:   https://%PRIMARY_HOST%:5173/#/
echo Hosts entry:
echo 192.168.1.110 kourosh.home.arpa
echo ======================================
pause
