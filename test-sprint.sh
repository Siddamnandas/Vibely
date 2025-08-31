#!/bin/bash

# Vibely - Next Sprint Test Script

echo "🧪 Testing Vibely Next Sprint Implementation"

# Test 1: Environment variables
echo "1. Testing environment variables..."
if [ -f .env.example ]; then
  echo "✅ .env.example exists"
else
  echo "❌ .env.example missing"
fi

# Test 2: Spotify Auth Routes
echo "2. Testing Spotify Auth Routes..."
curl -s -o /dev/null -w "Exchange Route: %{http_code}\n" http://localhost:3001/api/auth/spotify/exchange
curl -s -o /dev/null -w "Refresh Route: %{http_code}\n" http://localhost:3001/api/auth/spotify/refresh
curl -s -o /dev/null -w "Logout Route: %{http_code}\n" http://localhost:3001/api/auth/spotify/logout

# Test 3: AI Regen Routes
echo "3. Testing AI Regen Routes..."
curl -s -o /dev/null -w "Regen Route: %{http_code}\n" http://localhost:3001/api/ai/regen

# Test 4: Notification Routes
echo "4. Testing Notification Routes..."
curl -s -o /dev/null -w "Register Route: %{http_code}\n" http://localhost:3001/api/notifications/register
curl -s -o /dev/null -w "Unregister Route: %{http_code}\n" http://localhost:3001/api/notifications/unregister

# Test 5: Cookie Handling
echo "5. Testing Cookie Handling..."
curl -s http://localhost:3001/api/test/spotify-auth | grep -q "success" && echo "✅ Cookie handling works" || echo "❌ Cookie handling failed"

echo "✅ All tests completed!"