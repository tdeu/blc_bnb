@echo off
echo Starting BlockCast Services...
echo.
echo Frontend: http://localhost:3000
echo AI Proxy: http://localhost:3001
echo Market Monitor: http://localhost:3002
echo.
echo Press Ctrl+C to stop all services
echo.

start "BlockCast Frontend" cmd /k npm run dev
timeout /t 2 /nobreak >nul
start "BlockCast AI Proxy" cmd /k npm run server
timeout /t 2 /nobreak >nul
start "BlockCast Market Monitor" cmd /k npm run monitor

echo.
echo All services started in separate windows!
echo Close each window or press Ctrl+C in each to stop services.
