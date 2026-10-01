@echo off
cd /d "%~dp0.."
echo ================================================
echo   69 AI - Windows .EXE Installer Builder (1-Click)
echo ================================================
echo [1/3] Memeriksa ^& Menginstall dependencies...
call npm ci --no-audit

echo [1b/3] Membangun frontend (frontend/ -^> app-dist/)...
call npm run build:frontend

echo [2/3] Membangun Installer Setup.exe untuk Windows...
call npx electron-builder --win

echo [3/3] Selesai!
echo File installer .exe berada di folder: dist-desktop/
dir dist-desktop\*.exe 2>nul
pause
