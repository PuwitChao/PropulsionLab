@echo off
echo Starting Propulsion Analysis Web Platform...

echo.
echo Launching Backend (FastAPI) on http://localhost:8000...
start "Propulsion API" cmd /k "cd backend && python main.py"

echo.
echo Launching Frontend (React/Vite) on http://localhost:5173...
start "Propulsion UI" cmd /k "cd frontend && npm run dev"

echo.
echo Setup complete. Please wait for the servers to initialize.
echo Auto-opening browser to http://localhost:5173...
timeout /t 3 >nul
start http://localhost:5173
echo.
echo Profiles, data, and analysis ready.
pause
