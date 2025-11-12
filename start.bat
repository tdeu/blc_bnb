@echo off
echo ========================================
echo Starting BlockCast Development Environment
echo ========================================
echo.

REM Start AI Proxy Server
start "BlockCast AI Proxy" cmd /k "npx tsx src/api/anthropic-proxy.ts"

REM Wait 2 seconds for API server to start
timeout /t 2 /nobreak >nul

REM Start Frontend
start "BlockCast Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo Services Started:
echo - AI Proxy Server: http://localhost:3001
echo - Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to stop all services...
pause >nul

REM Kill all node processes (this closes both servers)
taskkill /F /FI "WINDOWTITLE eq BlockCast*" >nul 2>&1
