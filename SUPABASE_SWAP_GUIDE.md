# Supabase Swap Guide

## Overview
This guide explains how to swap the web app from Google Sheets to Supabase for fetching training plans, while keeping Sheets as a fallback.

## What's Been Done

### 1. ✅ Updated AuthContext
- Added `clientId` to User interface
- On login, the app now fetches the client's Supabase ID by matching username to `clients.name`
- Falls back gracefully if Supabase client not found

### 2. ✅ Created `supabasePlans.ts` Service
New functions to fetch plan data from Supabase:
- `getActivePlan(clientId)` - Gets the active plan for a client
- `getPlanDays(planId)` - Gets all 14 days for a plan
- `getDayExercises(dayId)` - Gets exercises for a specific day
- `getTodayExercises(clientId)` - Gets today's exercises based on current_day
- `getAllDaysSummary(clientId)` - Gets overview of all 14 days with exercise counts

## Next Steps to Complete the Swap

### Step 3: Update DataContext

Add a feature flag and dual-source logic:

```typescript
// At the top of DataContext.tsx
const USE_SUPABASE = true; // Toggle between Supabase and Sheets

// In loadData function:
if (USE_SUPABASE && user.clientId) {
  // Use Supabase
  const exercises = await getTodayExercises(user.clientId);
  setExercises(exercises);
} else {
  // Fallback to Sheets
  const sheet = await getUserSheet();
  const exercises = await fetchTodayExercises(currentUser, sheet);
  setExercises(exercises);
}
```

### Step 4: Update Overview.tsx

The Overview page needs to fetch the 14-day summary:

```typescript
// Add to imports
import { getAllDaysSummary } from "@/services/supabasePlans";
import { useAuth } from "@/contexts/AuthContext";

// In component:
const { user } = useAuth();

useEffect(() => {
  if (user?.clientId) {
    // Fetch from Supabase
    const daysSummary = await getAllDaysSummary(user.clientId);
    // Update state with daysSummary
  } else {
    // Fallback to Sheets
    // ... existing Sheets logic
  }
}, [user]);
```

### Step 5: Update Today.tsx

Today page should work automatically since it uses `DataContext.exercises`, which we updated in Step 3.

### Step 6: Testing Checklist

- [ ] Login with a username that exists in both Sheets and Supabase `clients` table
- [ ] Verify `clientId` is set in localStorage after login
- [ ] Check Overview page shows 14 days from Supabase
- [ ] Check Today page shows correct exercises for current day
- [ ] Test with `USE_SUPABASE = false` to ensure Sheets fallback still works
- [ ] Test with a user that doesn't exist in Supabase (should fall back to Sheets)

## Data Mapping

### Google Sheets → Supabase

| Sheets | Supabase |
|--------|----------|
| User row in master sheet | `clients` table |
| Training day column | `plan_days.day_index` |
| Exercise name | `exercises.name` |
| Sets/Reps/Weight | `session_block_items.extra` |
| Format (AMRAP, EMOM, etc) | `session_blocks.parameters.format` |

### Key Differences

1. **Sheets**: Flat structure, one row per exercise
2. **Supabase**: Hierarchical: Plan → Days → Sessions → Blocks → Items → Exercises

The `supabasePlans.ts` service flattens this hierarchy back into the `Exercise[]` format that the UI expects.

## Rollback Plan

If something breaks:
1. Set `USE_SUPABASE = false` in DataContext
2. App will fall back to Google Sheets
3. No data loss, no downtime

## Benefits of Supabase

✅ Real-time updates (admin changes plans, client sees immediately)
✅ No Google Sheets API quota limits
✅ Better performance (direct database queries)
✅ Richer data structure (formats, blocks, parameters)
✅ Admin can create/edit plans in the web UI
✅ Client progress tracking in same database

## Current Limitations

⚠️ Google Sheets still used for:
- User authentication (master sheet)
- Workout logging (for now)
- Historical data

These can be migrated later if needed.

