#!/bin/bash

# ML Service Setup Script
# Installs dependencies and sets up the Python ML service

echo "🤖 Setting up ML Service..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.8+ first."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "🔄 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📥 Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Copy .env file
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "⚠️  Please update .env with your database credentials"
fi

echo ""
echo "✅ ML Service setup complete!"
echo ""
echo "To start the service:"
echo "  1. Activate venv: source venv/bin/activate"
echo "  2. Run: python app.py"
echo ""
echo "The service will be available at: http://localhost:5001"
echo ""
echo "API Endpoints:"
echo "  GET  /health              - Service health check"
echo "  GET  /predict             - Get maintenance predictions"
echo "  GET  /recommendations     - Get maintenance recommendations"
echo "  POST /batch-analysis      - Run daily analysis & training"
echo "  GET  /model-info          - Get model information"
