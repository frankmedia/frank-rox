# Competitions Table Migration Summary

## Overview
This migration adds support for multiple named competitions with simulation dates and competition dates.

---

## What's New

### 3 New Tables

#### 1. `competitions` Table
Stores competition events:
- **title**: "Spring HYROX Challenge 2025"
- **description**: Competition details
- **workout_type**: 'hyrox_full', 'hyrox_half', 'deka_strong', 'deka_half'
- **simulation_date**: When athletes should complete their simulation (visible on profile)
- **competition_date**: Actual race date (optional)
- **registration_start/end**: Sign-up window
- **prize_description**: What athletes can win
- **is_active**: Show/hide competition

#### 2. `competition_entries` Table
Tracks who signed up:
- Links competition to user
- Stores athlete data snapshot (name, surname, email, sex, DOB)
- Tracks completion status
- One entry per user per competition

#### 3. `competition_results` Table
Stores submitted results:
- Links to competition and entry
- Total time + station times
- Disqualification status
- Admin review fields

---

## Key Features

### Multiple Competitions
- Athletes can see multiple competitions
- Each has its own name, dates, and details
- Can run simultaneously

### Two Date Types
1. **Simulation Date**: When to complete the workout in the app
2. **Competition Date**: Actual race/event date (optional)

Both dates are visible on the athlete's profile when they sign up.

### Competition Names
Examples:
- "Spring HYROX Challenge 2025"
- "DEKA Strong Summer Showdown"
- "Half Hyrox Winter Warriors"

---

## Profile Display (Planned)

When an athlete signs up for a competition, their profile will show:

```
🏆 Your Competitions

┌─────────────────────────────────────┐
│ Spring HYROX Challenge 2025         │
│ 📅 Simulation: March 15, 2025       │
│ 🏁 Competition: March 22, 2025      │
│ ⏰ 12 days until simulation          │
│ [ ] Not completed yet               │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ DEKA Strong Summer Showdown         │
│ 📅 Simulation: April 10, 2025       │
│ ⏰ 38 days until simulation          │
│ ✅ Completed!                        │
└─────────────────────────────────────┘
```

---

## Backward Compatibility

### Old `competition_date` field in `roxsim_users`
- **Kept for backward compatibility**
- Can be used as personal competition date
- New competitions table is preferred
- No breaking changes

---

## Next Steps

### 1. Run Migration
```sql
-- Run in Supabase SQL Editor
-- File: migrations/add_competitions_table.sql
```

### 2. App Updates Needed

#### TypeScript Types
```typescript
// Add to src/types/index.ts
export interface Competition {
  id: string;
  title: string;
  description?: string;
  workout_type: WorkoutId;
  simulation_date: string;
  competition_date?: string;
  registration_start: string;
  registration_end: string;
  prize_description?: string;
  is_active: boolean;
}

export interface CompetitionEntry {
  id: string;
  competition_id: string;
  user_id: string;
  athlete_name: string;
  athlete_surname?: string;
  athlete_sex?: string;
  athlete_dob?: string;
  has_completed: boolean;
  completed_at?: string;
}
```

#### API Functions
```typescript
// src/lib/competitions.ts (new file)
export async function getActiveCompetitions(): Promise<Competition[]>
export async function getMyCompetitions(userId: string): Promise<CompetitionEntry[]>
export async function enterCompetition(competitionId: string, userId: string): Promise<void>
export async function submitCompetitionResult(entryId: string, result: any): Promise<void>
```

#### Profile Page Updates
- Show list of entered competitions
- Display simulation date + competition date
- Show countdown to simulation date
- Mark completed competitions

---

## Example Competition Data

```sql
-- Example: Create a competition
INSERT INTO public.competitions (
  title,
  description,
  workout_type,
  simulation_date,
  competition_date,
  registration_start,
  registration_end,
  prize_description,
  is_active
) VALUES (
  'Spring HYROX Challenge 2025',
  'Complete your fastest Half Hyrox simulation and compete against athletes worldwide!',
  'hyrox_half',
  '2025-03-15',
  '2025-03-22',
  '2025-03-01',
  '2025-03-14',
  'Top 3 win RoxPT merch pack + free coaching session',
  true
);
```

---

## Testing Checklist

After running migration:

### Database
- [ ] Verify 3 new tables exist
- [ ] Check indexes are created
- [ ] Test RLS policies
- [ ] Insert test competition
- [ ] Create test entry

### App (Future)
- [ ] Fetch active competitions
- [ ] Display on home screen
- [ ] Show on profile page
- [ ] Entry flow works
- [ ] Result submission works

---

## Rollback

If needed, rollback with:

```sql
DROP TABLE IF EXISTS public.competition_results CASCADE;
DROP TABLE IF EXISTS public.competition_entries CASCADE;
DROP TABLE IF EXISTS public.competitions CASCADE;
```

---

## Summary

✅ **Safe to run** - No breaking changes
✅ **Backward compatible** - Old competition_date field still works
✅ **Scalable** - Support unlimited competitions
✅ **Flexible** - Two date types (simulation + competition)
✅ **Named** - Each competition has a title
✅ **Ready for app integration** - Clear structure for frontend

**Run the migration now, app updates can come later!**

