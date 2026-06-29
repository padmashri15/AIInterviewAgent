#!/bin/bash

# Diagnostic Script for Interview Bot Backend

echo "=========================================="
echo "Interview Bot Backend Diagnostics"
echo "=========================================="
echo ""

# Check if backend .env file exists
echo "1. Checking .env file..."
if [ -f "backend/.env" ]; then
    echo "   ✓ .env file found"
    if grep -q "OPENAI_API_KEY" backend/.env; then
        echo "   ✓ OPENAI_API_KEY is set"
        API_KEY=$(grep "OPENAI_API_KEY" backend/.env | cut -d'=' -f2 | head -c 15)
        echo "   ✓ API Key preview: $API_KEY..."
    else
        echo "   ✗ OPENAI_API_KEY not found in .env"
    fi
else
    echo "   ✗ .env file NOT found"
    echo "   → Create backend/.env with OPENAI_API_KEY"
fi

echo ""
echo "2. Checking if backend server is running..."
if curl -s http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "   ✓ Backend is running on port 5000"
    HEALTH=$(curl -s http://localhost:5000/api/health)
    echo "   Response: $HEALTH" | head -c 100
    echo "..."
else
    echo "   ✗ Backend NOT running on port 5000"
    echo "   → Run: cd backend && npm start"
fi

echo ""
echo "3. Checking Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "   ✓ Node.js installed: $NODE_VERSION"
else
    echo "   ✗ Node.js not found"
fi

echo ""
echo "4. Checking npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo "   ✓ npm installed: $NPM_VERSION"
else
    echo "   ✗ npm not found"
fi

echo ""
echo "5. Checking backend dependencies..."
if [ -d "backend/node_modules" ]; then
    echo "   ✓ Backend node_modules exists"
    if [ -d "backend/node_modules/openai" ]; then
        echo "   ✓ OpenAI package installed"
    else
        echo "   ✗ OpenAI package NOT installed"
        echo "   → Run: cd backend && npm install"
    fi
else
    echo "   ✗ Backend dependencies not installed"
    echo "   → Run: cd backend && npm install"
fi

echo ""
echo "6. Testing OpenAI API endpoint..."
if [ -z "$(pgrep -f 'npm start')" ]; then
    echo "   ✗ Backend not running (can't test endpoint)"
else
    RESPONSE=$(curl -s -X POST http://localhost:5000/api/generate-questions \
      -H "Content-Type: application/json" \
      -d '{
        "technology": "swift",
        "yearsOfExperience": 5,
        "roleLevel": "proficient",
        "candidateName": "Test"
      }')
    
    if echo "$RESPONSE" | grep -q "questions"; then
        QUESTION_COUNT=$(echo "$RESPONSE" | grep -o '"id"' | wc -l)
        echo "   ✓ API endpoint working"
        echo "   ✓ Generated $QUESTION_COUNT questions"
    else
        echo "   ✗ API endpoint error or no questions"
        echo "   Response: $RESPONSE" | head -c 200
    fi
fi

echo ""
echo "=========================================="
echo "Diagnostics Complete"
echo "=========================================="
