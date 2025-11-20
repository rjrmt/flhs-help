#!/bin/bash
# Daily Development Workflow Script

echo "🚀 Starting Educational Management Hub Development..."

# Pull latest changes
echo "📥 Pulling latest changes from GitHub..."
git pull origin main

# Install dependencies if needed
echo "📦 Checking dependencies..."
npm install

# Start development server
echo "🎨 Starting development server..."
npm run dev
