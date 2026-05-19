@echo off
chcp 65001 >nul 2>&1
title Parallel

echo.
echo   Parallel - Living Murder Mystery Engine v0.4.0
echo.

cd /d "%~dp0"

if not exist node_modules (
    echo   [1/2] Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo.
        echo   ERROR: npm install failed.
        echo   Make sure Node.js is installed: https://nodejs.org/
        pause
        exit /b 1
    )
) else (
    echo   [1/2] Dependencies OK.
)

echo.
echo   [2/2] Starting server...
echo.

start "" /b npx next dev --port 3000

echo   Waiting for server to start...
:waitloop
timeout /t 1 /nobreak >nul 2>&1
curl -s -o nul -w "%%{http_code}" http://localhost:3000/ 2>nul | findstr "200" >nul 2>&1
if errorlevel 1 (
    echo   ...
    goto waitloop
)

echo.
echo   Server is ready! Opening browser...
echo.
echo   http://localhost:3000
echo   Press Ctrl+C to stop.
echo.

start http://localhost:3000

:keepalive
timeout /t 60 /nobreak >nul 2>&1
goto keepalive
