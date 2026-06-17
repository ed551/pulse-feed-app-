#!/bin/bash
# Read a commit message from user input
echo "Write your commit message:"
read -r msg

if [ -z "$msg" ]; then
  msg="Update from Termux local workspace"
fi

echo "🚀 Stage changes..."
git add .

echo "💾 Commit progress..."
git commit -m "$msg"

echo "📤 Pushing to GitHub (Will run automated tests & build)..."
git push origin main

echo "✅ Upload complete! Track your GitHub Actions pipeline for live deployment."
