@echo off
title Propulsion Analysis Suite Launcher
echo ====================================================================
echo      PROPULSION SYSTEMS WEB PLATFORM — INTEGRATED ENGINE LAUNCHER
echo ====================================================================
echo.
echo Running diagnostic port clearances and launching:
echo [1] FastAPI Backend  -- http://localhost:8000
echo [2] Vite UI Frontend -- http://localhost:5173
echo.
cd %~dp0
call scripts\run_platform.bat
