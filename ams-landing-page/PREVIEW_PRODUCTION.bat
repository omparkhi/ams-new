@echo off
title AMS Landing Page - Production Preview
cd /d "%~dp0"
echo Starting production build preview...
call npx vite preview --port 4173 --open
pause

