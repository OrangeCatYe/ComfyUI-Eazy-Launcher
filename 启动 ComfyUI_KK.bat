@echo off
title ComfyUI_KK Launcher
cd /d "%~dp0"

echo ============================================
echo   ComfyUI_KK Launcher
echo ============================================
echo.
echo Starting, please wait...
echo First launch installs backend deps (1-2 min), then it opens instantly.
echo.

set PYTHONIOENCODING=utf-8
python backend\main.py

if errorlevel 1 (
    echo.
    echo [ERROR] Launch failed. Make sure Python 3.8+ is installed and in PATH.
    echo Download: https://www.python.org/downloads/
    echo.
    pause
)
