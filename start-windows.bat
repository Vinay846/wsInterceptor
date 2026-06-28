@echo off
echo.
echo ====================================
echo   Starting WS Interceptor
echo ====================================
echo.
echo This application does NOT require admin permissions.
echo If you see a Windows SmartScreen warning:
echo   1. Click "More info"
echo   2. Click "Run anyway"
echo.
echo Starting server...
echo.

cd /d "%~dp0build"
if exist "wsinterceptor-win.exe" (
    start "" "wsinterceptor-win.exe"
    timeout /t 3 /nobreak >nul
    echo.
    echo Server should be starting...
    echo Opening browser in 5 seconds...
    timeout /t 5 /nobreak >nul
    start http://localhost:8083
) else (
    echo ERROR: wsinterceptor-win.exe not found in build folder!
    echo Please run: npm run build:executables
    pause
)

