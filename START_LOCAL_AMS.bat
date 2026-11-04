@echo off
title AMS - Local Product Server
cd /d "%~dp0"
echo ========================================================
echo    AMS (Attendance Management System) Local Server
echo ========================================================
echo.
echo Starting Flask backend on http://127.0.0.1:5000 ...
echo.
echo Super Admin Login:
echo   Username: admin
echo   Password: admin123
echo.
echo Company Admin Login Example:
echo   Username: TARS
echo   Password: svpcet@tars4
echo.
echo ========================================================
python run.py
pause

