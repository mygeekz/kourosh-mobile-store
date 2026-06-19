@echo off
setlocal
cd /d %~dp0

echo This project now uses the local reverse proxy for dev.
echo Run start.bat (or npm run dev:proxy) instead.
echo.
call start.bat
