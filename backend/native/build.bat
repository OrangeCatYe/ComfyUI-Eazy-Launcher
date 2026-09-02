@echo off
REM 编译窗口最小尺寸钩子 DLL（x64）
REM 由 build_winguard.py 调用；如需手动编译，先运行 vcvars64.bat 再执行本脚本。
setlocal
set SRC=%~dp0winguard.c
set OUT=%~dp0winguard64.dll
echo [build] compiling %SRC%
if "%1"=="debug" (
  cl /nologo /LD /Od /Zi /utf-8 /DGUARD_DEBUG /DWIN32_LEAN_AND_MEAN "%SRC%" /link /NOLOGO user32.lib /OUT:"%OUT%"
) else (
  cl /nologo /LD /O2 /utf-8 /DWIN32_LEAN_AND_MEAN "%SRC%" /link /NOLOGO user32.lib /OUT:"%OUT%"
)
if errorlevel 1 (
  echo [build] FAILED
  exit /b 1
)
echo [build] OK -^> %OUT%
exit /b 0
