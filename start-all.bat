@echo off
echo ========================================
echo Starting BlockCast FULL Development Environment
echo (AI Proxy + Market Monitor + Frontend)
echo ========================================
echo.

REM Start AI Proxy Server
start "BlockCast AI Proxy" cmd /k "npx tsx src/api/anthropic-proxy.ts"

REM Wait 2 seconds
timeout /t 2 /nobreak >nul

REM Start Market Monitor
start "BlockCast Market Monitor" cmd /k "npx tsx src/api/market-monitor-server.ts"

REM Wait 2 seconds
timeout /t 2 /nobreak >nul

REM Start Frontend
start "BlockCast Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo All Services Started:
echo - AI Proxy Server: http://localhost:3001
echo - Market Monitor: http://localhost:3002
echo - Frontend: http://localhost:3000
echo ========================================
echo.
echo Press any key to stop all services...
pause >nul

REM Kill all node processes (this closes all servers)
taskkill /F /FI "WINDOWTITLE eq BlockCast*" >nul 2>&1
