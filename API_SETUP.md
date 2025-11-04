# AI Assistant API Setup

## Required Environment Variables

Add these to your `.env` file locally and to **Vercel Environment Variables**:

```bash
# Gemini AI
GOOGLE_AI_MODEL=gemini-2.0-flash-exp
GOOGLE_AI_API_KEY=AIzaSyDJ1FDQRuC7wadSxYAswWrvVlcr8tNdzWc

# (Your existing Supabase vars)
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Vercel Deployment

### 1. Add Environment Variables to Vercel

Go to your Vercel project settings:
1. Navigate to **Settings** → **Environment Variables**
2. Add:
   - `GOOGLE_AI_MODEL` = `gemini-2.0-flash-exp`
   - `GOOGLE_AI_API_KEY` = `AIzaSyDJ1FDQRuC7wadSxYAswWrvVlcr8tNdzWc`

### 2. API Routes

The `/api/workout-assistant.ts` endpoint will be automatically deployed by Vercel.

Endpoint: `https://my.roxpt.app/api/workout-assistant`

### 3. Test the API

```bash
curl -X POST https://my.roxpt.app/api/workout-assistant \
  -H "Content-Type: application/json" \
  -d '{
    "action": "parse_workout",
    "data": {
      "workoutText": "Day 1: 3x10 Bench Press 60kg"
    }
  }'
```

## Local Testing

```bash
# Install dependencies
npm install

# Add .env file with variables above

# Run dev server
npm run dev

# Test locally
curl -X POST http://localhost:8081/api/workout-assistant \
  -H "Content-Type: application/json" \
  -d '{"action": "parse_workout", "data": {"workoutText": "Test"}}'
```

## Troubleshooting

### "Empty response" error
- **Cause**: `GOOGLE_AI_API_KEY` not set in environment variables
- **Fix**: Add the key to Vercel dashboard and redeploy

### "404 Not Found" error
- **Cause**: API route not deployed or vercel.json misconfigured
- **Fix**: Check `vercel.json` excludes `/api/*` from rewrites

### "Invalid JSON" error
- **Cause**: Gemini returned non-JSON response (markdown code blocks)
- **Fix**: Already handled in code - strips markdown fences

## Database Migration

Don't forget to run the migration:

```sql
-- In Supabase SQL Editor
-- Run: supabase_migration_workout_assistant.sql
```

This creates the `workout_conversations` and `conversation_messages` tables.

