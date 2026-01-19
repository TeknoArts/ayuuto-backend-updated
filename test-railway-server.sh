#!/bin/bash

# Test Railway Server Script
# Usage: ./test-railway-server.sh <your-railway-url>

if [ -z "$1" ]; then
    echo "Usage: ./test-railway-server.sh <your-railway-url>"
    echo "Example: ./test-railway-server.sh https://your-app.up.railway.app"
    exit 1
fi

RAILWAY_URL=$1

echo "🚀 Testing Railway Server: $RAILWAY_URL"
echo ""

# Test 1: Root endpoint
echo "1️⃣ Testing root endpoint..."
curl -s "$RAILWAY_URL/" | jq '.' || curl -s "$RAILWAY_URL/"
echo ""
echo ""

# Test 2: Health check (if exists)
echo "2️⃣ Testing health endpoint..."
curl -s "$RAILWAY_URL/api/health" | jq '.' || echo "Health endpoint not found"
echo ""
echo ""

# Test 3: Check server response time
echo "3️⃣ Testing server response time..."
time curl -s -o /dev/null -w "Response time: %{time_total}s\n" "$RAILWAY_URL/"
echo ""

# Test 4: Check HTTP status
echo "4️⃣ Testing HTTP status..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$RAILWAY_URL/")
echo "HTTP Status Code: $HTTP_CODE"
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Server is responding correctly!"
else
    echo "⚠️  Server returned status code: $HTTP_CODE"
fi
echo ""

echo "✅ Testing complete!"
