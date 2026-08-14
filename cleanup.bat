@echo off
echo Cleaning project dependencies...
echo.

echo Removing node_modules...
rmdir /s /q node_modules
if errorlevel 1 (
    echo Failed to remove node_modules. Is a server running?
    pause
    exit /b
)

echo Removing package-lock.json...
del package-lock.json

echo Removing dist folder...
rmdir /s /q dist

echo.
echo Installing fresh dependencies...
call npm install

echo.
echo Cleanup complete! You can now try to build or deploy.
pause
