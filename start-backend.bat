@echo off
REM ═══════════════════════════════════════════════════════════
REM QueueCare — Start Backend (Command 1 of 2)
REM ═══════════════════════════════════════════════════════════
echo.
echo  🏥 QueueCare Backend
echo  ════════════════════
echo.

cd /d "%~dp0backend"

REM Install Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

echo.
echo Starting FastAPI server on http://localhost:8000 ...
echo.

REM Start the server (auto-reload for development)
uvicorn main:app --reload --port 8000
