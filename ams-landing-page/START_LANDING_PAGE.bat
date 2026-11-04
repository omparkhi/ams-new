@echo off
title AMS Landing Page Server
cd /d "%~dp0"
echo ========================================================
echo   AMS - AI Attendance & Student Management System
echo   Starting local dev server at http://localhost:3000 ...
echo ========================================================
start http://localhost:3000
call npm run dev
pause

