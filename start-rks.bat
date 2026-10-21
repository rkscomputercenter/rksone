@echo off
echo ========================================================
echo RKS Shop Management System - Startup
echo ========================================================

echo Checking if Docker is running...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker is not running or not installed. 
    echo Please start Docker Desktop and try again.
    pause
    exit /b
)

echo.
echo Starting the RKS System via Docker Compose...
docker-compose up --build -d

echo.
echo ========================================================
echo The system is starting in the background.
echo.
echo Frontend (Application): http://localhost:5000
echo Backend API (Health):   http://localhost:5001/api/health
echo.
echo Note: It might take a minute for the database and backend
echo       to fully initialize on the first run.
echo ========================================================
pause
