#!/bin/bash

# Test Program Generation Script
# This script runs the standalone program generation test

echo "🧪 Running Program Generation Tests..."
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create a .env file with:"
    echo "  VITE_SUPABASE_URL=your-url"
    echo "  VITE_SUPABASE_ANON_KEY=your-key"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Prompt for test client ID
echo "Enter test client ID (or press Enter to use default):"
read CLIENT_ID

if [ -z "$CLIENT_ID" ]; then
    # Try to get a client from the database
    echo "Fetching a test client from database..."
    # You'll need to add your own logic here or hardcode a test client
    CLIENT_ID="your-default-test-client-id"
fi

echo "Using client ID: $CLIENT_ID"
echo ""

# Run the test script
npx tsx src/services/programGeneration/__tests__/testProgramGeneration.ts

# Capture exit code
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ All tests passed!"
else
    echo ""
    echo "❌ Tests failed with exit code $EXIT_CODE"
fi

exit $EXIT_CODE

