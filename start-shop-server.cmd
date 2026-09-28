@echo off
REM ---------------------------------------------------------------------------
REM  Mechanist Calculator - local server launcher
REM
REM  Offline support needs a service worker, and browsers only register one
REM  over http(s). Opening index.html by double clicking gives you file:// and
REM  no offline copy, so run this instead and leave the window open.
REM ---------------------------------------------------------------------------
setlocal
cd /d "%~dp0"

set PORT=8845

where python >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Python was not found on this machine.
  echo   Install Python 3 from https://www.python.org/downloads/
  echo   and tick "Add python.exe to PATH" during setup, then run this again.
  echo.
  pause
  exit /b 1
)

REM Is the port free? Try to bind it. No SO_REUSEADDR here: on Windows that
REM option lets the bind succeed even when the port is already taken, which
REM would make this check lie.
set CHK=import os,socket as k;s=k.socket();s.bind(('0.0.0.0',int(os.environ['PORT'])))

python -c "%CHK%" >nul 2>&1
if errorlevel 1 set PORT=8846
python -c "%CHK%" >nul 2>&1
if errorlevel 1 (
  echo.
  echo   Ports 8845 and 8846 are both in use. Close whatever is holding them
  echo   and run this again.
  echo.
  pause
  exit /b 1
)

echo.
echo   Mechanist Calculator
echo   ====================
echo.
echo   Serving this folder on port %PORT%.
echo   Leave this window open while you use the app.
echo.
echo   On this PC:      http://127.0.0.1:%PORT%/index.html
echo   On your phone:   http://^<this PC's IPv4 address^>:%PORT%/index.html
echo                   (run ipconfig to find the address, stay on the same Wi-Fi)
echo.

REM Give the server a moment to bind before the browser asks for the page.
start "" /b cmd /c "timeout /t 2 /nobreak >nul & start "" http://127.0.0.1:%PORT%/index.html"

python -m http.server %PORT% --bind 0.0.0.0

echo.
echo   The server has stopped.
pause
