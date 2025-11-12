# Frank Client Setup Guide

## Overview
This guide will set up the `frank` client account to enable full app functionality including workout logging, PB tracking, and program management.

---

## Step 1: Run Database Migration

### Open Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**

### Run the Migration
Copy and paste the entire contents of `migrations/create_frank_client.sql` and click **Run**.

This will:
- ✅ Create the `frank` client record
- ✅ Grant necessary permissions to the `anon` role
- ✅ Enable workout logging and PB tracking

---

## Step 2: Login to the App

### Credentials
- **Username**: `frank`
- **Password**: `frank123`

### Login Process
1. Open the mobile app
2. Navigate to the login page
3. Enter credentials above
4. Click "Sign In"

---

## Step 3: Verify Everything Works

### ✅ Workout Logging
1. Complete an exercise
2. Rate it with the flame icons
3. Go to **History** page
4. Verify the workout appears in the logbook

### ✅ Personal Bests
1. Complete a strength exercise with weight
2. Complete it again with higher weight
3. Check for PB notification
4. Verify PB badge in History

### ✅ Program Tracking
1. Generate a program in **Programme Builder**
2. Complete exercises throughout the week
3. Check **Overview** page for completion ticks
4. Verify progress is saved across app restarts

---

## Troubleshooting

### Issue: "Invalid username or password"
**Solution**: Ensure you ran the migration SQL in Supabase first.

### Issue: Workouts not showing in History
**Possible Causes**:
1. Not logged in with a valid `clientId`
2. Database permissions not granted
3. Network connection issue

**Solution**:
```sql
-- Check if client exists
SELECT id, name, email FROM clients WHERE name = 'frank';

-- Check permissions
SELECT grantee, privilege_type 
FROM information_schema.role_table_grants 
WHERE table_name = 'workout_logs' AND grantee = 'anon';
```

### Issue: PBs not tracking
**Solution**: PBs require historical data. Complete the same exercise multiple times with different weights/times to see PB detection.

---

## Database Schema

### Client Record
```sql
{
  id: UUID (auto-generated),
  name: 'frank',
  email: 'frank@roxpt.app',
  password: 'frank123',
  created_at: timestamp,
  updated_at: timestamp
}
```

### Workout Logs
Stored in `workout_logs` table:
- `client_id`: Links to frank's client record
- `plan_id`: Active plan (if any)
- `training_day`: Day number in program
- `exercise_name`: Name of exercise
- `weight`, `weights`, `sets`, `reps`: Strength data
- `duration_min`, `distance_km`: Cardio data
- `rating`: Flame rating (1-5)
- `is_pb`: Boolean flag for personal bests
- `logged_at`: Timestamp

---

## Next Steps

### Assign a Program
1. Login as **admin** (`roxptadmin` / `1gfGLi20jerpVaWJMTQ0`)
2. Go to **Admin → Clients**
3. Find Frank
4. Assign a program

### Create a PT Account
1. Login as admin
2. Go to **Admin → Personal Trainers**
3. Create a new PT
4. Assign Frank to that PT

---

## Security Notes

⚠️ **Important**: This setup uses plain-text passwords for development. In production:
- Hash passwords with bcrypt or similar
- Use proper authentication tokens
- Implement rate limiting
- Add 2FA for admin accounts

---

## Files Modified

- `migrations/create_frank_client.sql` - Database migration
- `src/contexts/AuthContext.tsx` - Custom auth logic
- `src/services/workoutCache.ts` - Workout logging and PB tracking
- `src/pages/ExerciseDetail.tsx` - Exercise completion flow
- `src/pages/History.tsx` - Workout history display

---

**Last Updated**: 2025-11-12  
**Status**: ✅ Ready to use

