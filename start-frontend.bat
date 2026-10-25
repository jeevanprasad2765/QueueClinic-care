@echo off
REM ═══════════════════════════════════════════════════════════
REM QueueCare — Start Frontend (Command 2 of 2)
REM ═══════════════════════════════════════════════════════════
echo.
echo  🏥 QueueCare Frontend
echo  ═════════════════════
echo.

cd /d "%~dp0frontend"

REM Install Node dependencies
echo Installing Node dependencies...
call npm install

echo.
echo Starting Vite dev server...
echo.

call npm run dev
