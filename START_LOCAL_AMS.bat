@echo off
title AMS SaaS - Full Stack Local Server (React + Flask)
cd /d "%~dp0"

:: Set PATH to include local Python 3.11 and Node.js
set PATH=C:\Users\ASUS\AppData\Local\Programs\Python\Python311;C:\Users\ASUS\AppData\Local\Programs\nodejs;%PATH%

echo ===================================================================
echo     AMS AI Contactless Attendance - Multi-Tenant SaaS Platform
echo ===================================================================
echo.
echo [1/2] Starting Python Flask REST API Backend (http://127.0.0.1:5000) ...
start "AMS Backend (Flask API)" cmd /k "title AMS Backend & cd /d %~dp0 & python run.py"

echo.
echo [2/2] Starting React + Vite SaaS Frontend (http://localhost:3000) ...
start "AMS Frontend (React Vite)" cmd /k "title AMS Frontend & cd /d %~dp0ams-landing-page & npm run dev"

echo.
echo ===================================================================
echo   SaaS System Ready!
echo.
echo   - Public Landing Page : http://localhost:3000/
echo   - Self-Service Signup : http://localhost:3000/signup
echo   - Client Login Portal : http://localhost:3000/login
echo   - REST API Docs/Root  : http://127.0.0.1:5000/api/auth/me
echo.
echo   Features:
echo   * Instant self-service client onboarding (no manual setup required)
echo   * High-accuracy 20-frame camera burst biometric enrollment
echo   * Live contactless attendance kiosk with 6-hour checkout protection
echo   * Stylized OpenPyXL Excel reports
echo ===================================================================
echo.
pause
