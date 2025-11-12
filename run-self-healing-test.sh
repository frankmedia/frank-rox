#!/bin/bash

echo "🧪 Starting Self-Healing Automated Test..."
echo ""

# Extract Supabase credentials from .env (handle quotes and spaces)
export NEXT_PUBLIC_SUPABASE_URL=$(grep "^NEXT_PUBLIC_SUPABASE_URL=" .env | cut -d '=' -f2- | tr -d '"')
export NEXT_PUBLIC_SUPABASE_ANON_KEY=$(grep "^NEXT_PUBLIC_SUPABASE_ANON_KEY=" .env | head -1 | cut -d '=' -f2- | tr -d '"')

echo "Using Supabase URL: $NEXT_PUBLIC_SUPABASE_URL"
echo ""

# Run the test with tsx
npx tsx src/services/programGeneration/__tests__/selfHealingTest.ts

