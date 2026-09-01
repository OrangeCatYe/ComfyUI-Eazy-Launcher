@echo off
chcp 65001 >nul
title ComfyUI_KK 启动器
cd /d "%~dp0"

echo ============================================
echo   ComfyUI_KK 启动器
echo ============================================
echo.
echo 正在启动，请稍候...
echo 首次启动会自动安装后端依赖（约 1-2 分钟），之后秒开。
echo.

python backend\main.py

if errorlevel 1 (
    echo.
    echo [错误] 启动失败，请确认已安装 Python 3.8+ 并加入 PATH。
    echo 下载地址：https://www.python.org/downloads/
    echo.
    pause
)
