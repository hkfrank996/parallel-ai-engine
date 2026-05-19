@echo off
chcp 65001 >nul 2>&1
title Parallel - AI World Engine

echo.
echo  ╔═══════════════════════════════════════╗
echo  ║   Parallel — Living Mystery v0.4.0    ║
echo  ╚═══════════════════════════════════════╝
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo  [1/2] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo  ERROR: npm install failed. Please check Node.js is installed.
        echo  Download from: https://nodejs.org/
        pause
        exit /b 1
    )
) else (
    echo  [1/2] Dependencies ready.
)

echo.
echo  [2/2] Starting Parallel...
echo.
echo  ───────────────────────────────────────
echo   Open your browser and visit:
echo.
echo     http://localhost:3000
echo.
echo   Press Ctrl+C to stop the server.
echo  ───────────────────────────────────────
echo.

call npx next dev --port 3000
pause
