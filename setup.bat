@echo off
REM BuzzForge Quick Start Script for Windows

echo.
echo 🚀 BuzzForge Setup
echo ====================
echo.

REM Create backend .env file
echo 📝 Setting up backend...
cd backend
if not exist .env (
  copy .env.example .env
  echo ✓ Created .env file (update with your MongoDB URI)
)

echo 📦 Installing backend dependencies...
call npm install

REM Create frontend configuration
cd ..\frontend
echo.
echo 📝 Setting up frontend...
echo 📦 Installing frontend dependencies...
call npm install

echo.
echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Update backend\.env with your MongoDB connection string
echo 2. Start backend: cd backend ^&^& npm run dev
echo 3. Start frontend: cd frontend ^&^& npm start
echo.
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo Admin Panel: http://localhost:3000/admin
echo.
pause
