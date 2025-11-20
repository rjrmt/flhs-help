#!/bin/bash
# Quick Git Push Script

echo "🚀 Quick Git Push for Educational Management Hub..."

# Add all changes
echo "📦 Adding all changes..."
git add .

# Commit with timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')
git commit -m "feat: update Educational Management Hub - $TIMESTAMP"

# Push to GitHub
echo "⬆️ Pushing to GitHub..."
git push origin main

echo "✅ Done! Your changes are now on GitHub."
