#!/bin/bash

# MMCL Production - Quick Start Script
# This script sets up the entire development environment

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║       MMCL Production Application - Quick Start            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

if ! command -v mysql &> /dev/null; then
    echo "⚠️  MySQL is not installed. You need MySQL to run this application."
    echo "   Install MySQL and ensure it's running on port 3306."
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo ""

echo "  → Backend dependencies..."
cd backend
npm install > /dev/null 2>&1
echo "    ✅ Backend dependencies installed"

echo "  → Frontend dependencies..."
cd ../frontend
npm install > /dev/null 2>&1
echo "    ✅ Frontend dependencies installed"

cd ..
echo ""

# Database setup
echo "💾 Database Setup"
echo ""
echo "Before proceeding, ensure:"
echo "  1. MySQL is running on localhost:3306"
echo "  2. You have root access to MySQL"
echo ""
read -p "Press Enter to continue or Ctrl+C to abort..."

echo ""
echo "Setting up database..."
cd database

# Check if schema needs to be created
read -p "MySQL root password (press Enter if no password): " DB_PASSWORD

if [ -z "$DB_PASSWORD" ]; then
    mysql -u root < schema.sql 2>/dev/null && echo "  ✅ Database schema created"
    mysql -u root mmcl_production < seed_data.sql 2>/dev/null && echo "  ✅ Master data loaded"
else
    mysql -u root -p"$DB_PASSWORD" < schema.sql 2>/dev/null && echo "  ✅ Database schema created"
    mysql -u root -p"$DB_PASSWORD" mmcl_production < seed_data.sql 2>/dev/null && echo "  ✅ Master data loaded"
fi

cd ..
echo ""

# Create .env files
echo "⚙️  Creating environment files..."

if [ ! -f "backend/.env" ]; then
    cp backend/.env.example backend/.env
    echo "  ✅ backend/.env created"
fi

if [ ! -f "frontend/.env" ]; then
    cp frontend/.env.example frontend/.env
    echo "  ✅ frontend/.env created"
fi

echo ""

# Build backend
echo "🔨 Building backend TypeScript..."
cd backend
npm run build > /dev/null 2>&1
echo "  ✅ Backend built successfully"
cd ..

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║              ✅ Setup Complete!                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1️⃣  Start the backend:"
echo "   npm run dev:backend"
echo ""
echo "2️⃣  In a new terminal, start the frontend:"
echo "   npm run dev:frontend"
echo ""
echo "3️⃣  Open http://localhost:3000 in your browser"
echo ""
echo "🔐 Test Login Credentials:"
echo ""
echo "   Regular User:"
echo "   Email: user1@mmcl.com"
echo "   Password: user123"
echo ""
echo "   Admin User:"
echo "   Email: admin1@mmcl.com"
echo "   Password: admin123"
echo ""
echo "📚 For more details, see README.md and docs/DEPLOYMENT.md"
echo ""
