# 🐛 Workout Log Not Syncing to Supabase

## Problem
When a user completes a mobility exercise (7 minutes logged), the data is NOT being saved to Supabase's `workout_logs` table. The checkmark appears on the exercise card, but when the Today page fetches logs from Supabase, it returns an empty array.

## Console Logs Showing the Issue

```
📊 Fetching logs for clientId: 2, training day: 3
📊 Raw logs from Supabase: Array []
📊 No logs found in Supabase for this day
✅ Loaded completed exercises: Array [ "Mobility circuit" ]
```

The exercise is marked as "completed" but no workout log exists in Supabase.

## Expected Behavior
1. User completes exercise with 7 minutes duration
2. Data should be saved to Supabase `workout_logs` table
3. When Today page loads, it should fetch and display "✓ 7 min" on the card

## Current Behavior
1. User completes exercise
2. Checkmark appears (exercise marked complete)
3. No data in Supabase
4. Today page shows checkmark but no "✓ 7 min" text

---

## Code Analysis

### 1. ExerciseDetail.tsx - Save Function

The `handleMarkAsDone` function should save to Supabase:

```typescript
// Location: src/pages/ExerciseDetail.tsx, line ~350-550

const handleMarkAsDone = async (customRating?: number) => {
  if (!exercise) return;

  // Build data object
  const data: any = {
    rating: customRating !== undefined ? customRating : rating,
  };

  if (exercise.type === "cardio" || exercise.type === "running") {
    let distanceKm: number | undefined;
    if (todaysDistance) {
      const isMeters = exercise.targetDistanceKm && exercise.targetDistanceKm < 1;
      distanceKm = isMeters ? parseFloat(todaysDistance) / 1000 : parseFloat(todaysDistance);
    }
    data.distance = distanceKm;
    data.duration = todaysDuration ? parseFloat(todaysDuration) : undefined;
  } else if (exercise.type === "mobility") {
    // Mobility exercises: duration only, no PB tracking
    data.duration = todaysDuration ? parseFloat(todaysDuration) : undefined;
  } else if (exercise.type === "weights") {
    data.weights = setWeights.map(w => w ? parseFloat(w) : 0);
    data.sets = exercise.sets;
    data.reps = exercise.reps;
  } else if (exercise.type === "bodyweight") {
    data.sets = exercise.sets;
    data.reps = exercise.reps;
  }

  console.log('💾 Saving exercise data:', {
    exerciseName: exercise.name,
    exerciseType: exercise.type,
    data,
    todaysDuration,
    todaysDistance,
    existingLogId
  });

  // Check if we have meaningful data
  const hasData = Object.values(data).some(value => value !== undefined && value !== null);
  if (!hasData) {
    toast.warning("No data to save");
    return;
  }

  // ... (update existing log logic) ...

  // SYNC TO SUPABASE
  try {
    const userStr = localStorage.getItem("frank_rock_user");
    if (!userStr) {
      toast.error("User not found");
      return;
    }
    
    const user = JSON.parse(userStr);
    const username = user.username || "";
    const userKey = `currentTrainingDay_${username}`;
    const trainingDay = parseInt(localStorage.getItem(userKey) || "1");
    
    // Mark exercise as complete in cache
    markExerciseComplete(username, trainingDay, exercise.id, authUser?.clientId);
    
    // Check for Personal Best and sync to Supabase if logged in
    console.log('🔍 Checking authUser for Supabase sync:', { authUser, clientId: authUser?.clientId });
    
    if (authUser?.clientId) {
      console.log('✅ authUser has clientId, syncing to Supabase...');
      
      const pbResult = await checkPersonalBest(
        authUser.clientId,
        exercise.name,
        {
          weight: data.weight,
          weights: data.weights,
          duration: data.duration,
          distance: data.distance,
        }
      );
      
      isPB = pbResult.isPB;
      oldPB = pbResult.oldPB;
      newPB = pbResult.newPB;
      
      const { data: plan } = await supabase
        .from("plans")
        .select("id")
        .eq("client_id", authUser.clientId)
        .eq("status", "active")
        .single();
        
      const syncResult = await syncWorkoutLogToSupabase(
        authUser.clientId,
        plan?.id || null,
        trainingDay,
        {
          exerciseName: exercise.name,
          exerciseId: exercise.id,
          weight: data.weight,
          weights: data.weights,
          sets: data.sets,
          reps: data.reps,
          duration: data.duration,
          distance: data.distance,
          rating: data.rating,
          isPB,
        }
      );
      
      if (syncResult.success) {
        console.log("✅ Exercise synced to Supabase with log ID:", syncResult.logId);
      }
      
      console.log("✅ Exercise synced to Supabase with PB check");
    }
    
    // Save to localStorage
    logs.unshift({
      id: Date.now().toString(),
      username,
      exerciseName: exercise.name,
      timestamp,
      ...data,
      isPB,
    });
    
    localStorage.setItem(storageKey, JSON.stringify(logs));
    
  } catch (error) {
    console.error("Error saving exercise:", error);
    toast.error("Failed to save exercise");
    return;
  }
  
  // Navigate
  if (!exercise.groupId) {
    if (currentIndex < exercises.length - 1) {
      const nextExercise = exercises[currentIndex + 1];
      navigate(`/exercise/${nextExercise.id}`);
      toast.success("✅ Moving to next exercise!");
    } else {
      endWorkoutSession();
      navigate("/");
      toast.success("🎉 All exercises complete!");
    }
  }
};
```

### 2. workoutCache.ts - Sync Function

```typescript
// Location: src/services/workoutCache.ts

export async function syncWorkoutLogToSupabase(
  clientId: number,
  planId: string | null,
  trainingDay: number,
  logData: {
    exerciseName: string;
    exerciseId: string;
    weight?: number;
    weights?: number[];
    sets?: number;
    reps?: number;
    duration?: number;
    distance?: number;
    rating?: number;
    isPB?: boolean;
  }
): Promise<{ success: boolean; logId?: string }> {
  try {
    console.log('💾 Syncing workout log to Supabase:', {
      clientId,
      planId,
      trainingDay,
      logData
    });

    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        client_id: clientId,
        plan_id: planId,
        training_day: trainingDay,
        exercise_name: logData.exerciseName,
        exercise_id: logData.exerciseId,
        weight: logData.weight,
        weights: logData.weights,
        sets: logData.sets,
        reps: logData.reps,
        duration_min: logData.duration,
        distance_km: logData.distance,
        rating: logData.rating,
        is_pb: logData.isPB || false,
        logged_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Supabase sync error:', error);
      return { success: false };
    }

    console.log('✅ Workout log synced to Supabase, ID:', data.id);
    return { success: true, logId: data.id };
  } catch (e) {
    console.error('❌ Exception during Supabase sync:', e);
    return { success: false };
  }
}
```

### 3. Today.tsx - Fetch Function

```typescript
// Location: src/pages/Today.tsx, line ~45-113

const fetchLogs = useCallback(async () => {
  console.log('🔍 Starting to fetch workout logs...');
  
  if (!authUser?.clientId) {
    console.log('❌ No clientId, skipping log fetch');
    return;
  }
  
  const userStr = localStorage.getItem("frank_rock_user");
  if (!userStr) {
    console.log('❌ No user in localStorage, skipping log fetch');
    return;
  }
  
  const userData = JSON.parse(userStr);
  const trainingDay = parseInt(localStorage.getItem(`currentTrainingDay_${userData.username}`) || "1");
  
  console.log(`📊 Fetching logs for clientId: ${authUser.clientId}, training day: ${trainingDay}`);
  
  try {
    const { data: logs, error } = await supabase
      .from('workout_logs')
      .select('exercise_name, duration_min, distance_km, weight, weights')
      .eq('client_id', authUser.clientId)
      .eq('training_day', trainingDay);
    
    if (error) {
      console.error('❌ Supabase error fetching logs:', error);
      return;
    }
    
    console.log('📊 Raw logs from Supabase:', logs);
    
    if (logs && logs.length > 0) {
      const logMap: Record<string, any> = {};
      logs.forEach(log => {
        logMap[log.exercise_name] = {
          duration: log.duration_min,
          distance: log.distance_km,
          weight: log.weight,
          weights: log.weights,
        };
      });
      console.log('📊 Mapped exercise logs:', logMap);
      setExerciseLogs(logMap);
    } else {
      console.log('📊 No logs found in Supabase for this day');
      setExerciseLogs({});
    }
  } catch (e) {
    console.error('❌ Error fetching exercise logs:', e);
  }
}, [authUser?.clientId]);

useEffect(() => {
  fetchLogs();
}, [fetchLogs, exercises]);

// Refetch logs when page gains focus
useEffect(() => {
  const handleFocus = () => {
    console.log('🔄 Page focused, refetching logs...');
    fetchLogs();
  };
  
  window.addEventListener("focus", handleFocus);
  return () => window.removeEventListener("focus", handleFocus);
}, [fetchLogs]);
```

### 4. ExerciseCard.tsx - Display Logic

```typescript
// Location: src/components/ExerciseCard.tsx, line ~165-182

{exercise.type === "mobility" && (
  <div className="flex items-center gap-4 text-muted-foreground flex-wrap">
    {exercise.durationMin && (
      <span className="text-4xl font-bold text-foreground">
        {exercise.durationMin < 1 
          ? `${Math.round(exercise.durationMin * 60)} sec` 
          : `${exercise.durationMin} min`}
      </span>
    )}
    {loggedDuration ? (
      <span className={exercise.durationMin ? "text-2xl font-bold text-green-400" : "text-4xl font-bold text-green-400"}>
        ✓ {loggedDuration} min
      </span>
    ) : !exercise.durationMin && (
      <span className="text-sm text-muted-foreground">Mobility</span>
    )}
  </div>
)}
```

---

## Questions to Investigate

1. **Is `handleMarkAsDone` being called at all?**
   - User needs to check console for `💾 Saving exercise data:` log
   - If missing, the function isn't being triggered

2. **Is the Supabase sync being reached?**
   - Check for `🔍 Checking authUser for Supabase sync:` log
   - Check for `✅ authUser has clientId, syncing to Supabase...` log
   - Check for `💾 Syncing workout log to Supabase:` log
   - Check for `✅ Exercise synced to Supabase with log ID:` log

3. **Is there a Supabase error?**
   - Check for `❌ Supabase sync error:` in console
   - Check for `❌ Exception during Supabase sync:` in console

4. **How is the exercise being marked as complete?**
   - If the checkmark appears but no logs are saved, something is calling `markExerciseComplete()` directly without going through `handleMarkAsDone()`
   - Check `workoutCache.ts` for the `markExerciseComplete` function

5. **Database schema check**
   - Verify `workout_logs` table exists in Supabase
   - Verify columns: `client_id`, `plan_id`, `training_day`, `exercise_name`, `exercise_id`, `duration_min`, `distance_km`, `weight`, `weights`, `sets`, `reps`, `rating`, `is_pb`, `logged_at`
   - Check RLS (Row Level Security) policies - they might be blocking inserts

---

## Supabase Table Schema

```sql
CREATE TABLE workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id INTEGER NOT NULL REFERENCES clients(id),
  plan_id UUID REFERENCES plans(id),
  training_day INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  exercise_id TEXT,
  weight NUMERIC,
  weights NUMERIC[],
  sets INTEGER,
  reps INTEGER,
  duration_min NUMERIC,
  distance_km NUMERIC,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  is_pb BOOLEAN DEFAULT false,
  logged_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'workout_logs';
```

---

## Test Case

1. User: `frank` (clientId: 2)
2. Training Day: 3
3. Exercise: "Mobility circuit" (type: "mobility")
4. Logged Duration: 7 minutes
5. Expected Result: Row in `workout_logs` table with:
   - `client_id = 2`
   - `training_day = 3`
   - `exercise_name = "Mobility circuit"`
   - `duration_min = 7`

---

## Debugging Steps

1. **Add more console logs to track the flow:**
   ```typescript
   console.log('🎯 handleMarkAsDone called for:', exercise.name);
   console.log('🎯 Data to save:', data);
   console.log('🎯 authUser:', authUser);
   console.log('🎯 clientId:', authUser?.clientId);
   ```

2. **Check if `syncWorkoutLogToSupabase` is being called:**
   - Add a log at the very start of the function
   - Check if it returns success or error

3. **Verify Supabase connection:**
   - Test a simple insert manually in Supabase SQL editor
   - Check RLS policies

4. **Check if the issue is specific to mobility exercises:**
   - Try completing a weights exercise and see if that syncs

---

## Possible Root Causes

1. **RLS Policy blocking inserts** - Most likely!
2. **`authUser.clientId` is undefined** - Check console logs
3. **Function not being called** - User clicking checkmark instead of completing exercise properly
4. **Async timing issue** - Navigation happening before sync completes
5. **Supabase client not initialized** - Check imports

---

## User Workflow Issue?

**IMPORTANT:** How is the user completing the exercise?

- Are they clicking a "Complete" button inside the exercise detail page?
- Or are they clicking the checkmark on the card on the Today page?

If clicking the checkmark on the card, that might just be marking it as "complete" in localStorage without actually saving workout data!

The proper flow should be:
1. Click exercise card → Opens ExerciseDetail page
2. Enter duration (7 min)
3. Click "Mark as Done" or "Complete" button
4. This calls `handleMarkAsDone()` which syncs to Supabase
5. Navigate back to Today page
6. Checkmark appears AND "✓ 7 min" shows

---

## Request for User

Please provide the FULL console log output from:
1. Opening the exercise
2. Entering the duration
3. Clicking the complete button
4. Returning to the Today page

Look for ALL logs that start with:
- `💾`
- `🔍`
- `✅`
- `❌`
- `📊`

