@echo off
echo Setting up MySQL database for Space Fighters...
echo.
echo Please make sure MySQL is running and you have root access.
echo.
pause

echo Running MySQL setup script...
mysql -u root -p < setup-local-db.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Database setup completed successfully!
    echo.
    echo You can now start the server with: npm run start:dev
    echo.
) else (
    echo.
    echo ❌ Database setup failed!
    echo.
    echo Please check:
    echo 1. MySQL is running
    echo 2. You have root access
    echo 3. Root password is correct
    echo.
)

pause
