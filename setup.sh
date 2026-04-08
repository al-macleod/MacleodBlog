#!/bin/bash

# BuzzForge Quick Start Script

echo "🚀 BuzzForge Setup"
echo "===================="
echo ""

# Create backend .env file
echo "📝 Setting up backend..."
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✓ Created .env file (update with your MongoDB URI)"
fi

echo "📦 Installing backend dependencies..."
npm install

# Create frontend configuration
cd ../frontend
echo ""
echo "📝 Setting up frontend..."
echo "📦 Installing frontend dependencies..."
npm install

echo ""
echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update backend/.env with your MongoDB connection string"
echo "2. Start backend: cd backend && npm run dev"
echo "3. Start frontend: cd frontend && npm start"
echo ""
echo "Backend: http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo "Admin Panel: http://localhost:3000/admin"
