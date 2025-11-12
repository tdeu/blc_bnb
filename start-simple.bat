@echo off
echo ========================================
echo Starting BlockCast Frontend Only (BSC Migration Mode)
echo ========================================
echo.
echo Note: AI Proxy and Market Monitor disabled during BSC migration
echo.

REM Start Frontend only
start "BlockCast Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo Frontend Started: http://localhost:3000
echo ========================================
echo.
echo To stop: Close the terminal window
