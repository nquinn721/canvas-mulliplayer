@echo off
echo Killing existing server processes...

:: Kill processes using port 3001
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3001') do (
    taskkill /F /PID %%a 2>nul
)

:: Kill Node.js processes that might be our server
taskkill /F /IM node.exe 2>nul

echo Existing server processes killed.
echo You can now start the server safely with: npm run start:dev
