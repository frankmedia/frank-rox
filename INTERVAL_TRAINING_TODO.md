# Interval Training - Implementation TODO

## Current Status
✅ **Fixed:** Overview now shows "8×500m" instead of "8×1"
✅ **Fixed:** Database stores `sets`, `reps`, `distance_m`, `rest_sec` correctly
✅ **Fixed:** Days 1-14 display correctly (not 2-15)

## Remaining Issue
❌ **ExerciseDetail page doesn't handle interval workouts properly**

When you click on an interval workout (e.g., "8×500m @ 90s rest"), it currently treats it as a single distance-based run.

## What Needs to Happen

### 1. Add `rest` field to Exercise type
```typescript
// src/types/workout.ts
export interface Exercise {
  // ... existing fields
  rest?: number; // Rest duration in seconds (for intervals)
}
```

### 2. Pass rest data from supabasePlans.ts
```typescript
// src/services/supabasePlans.ts
// In getDayExercises(), when mapping session_block_items:
const exerciseObj = {
  // ... existing fields
  rest: item.rest_sec || undefined, // Add rest duration
};
```

### 3. Create IntervalTimer component
```typescript
// src/components/IntervalTimer.tsx
// Features:
// - Shows "Set X of Y"
// - Stopwatch for each interval
// - Countdown rest timer between sets
// - "STOP & SAVE" after each interval
// - Automatic progression to next set after rest
```

### 4. Update ExerciseDetail.tsx
```typescript
// Detect interval workout:
const isIntervalWorkout = 
  (exercise.type === "cardio" || exercise.type === "running") &&
  exercise.sets && 
  exercise.sets > 1 &&
  exercise.targetDistanceKm;

// Show IntervalTimer instead of regular timer:
if (isIntervalWorkout) {
  return <IntervalTimer 
    sets={exercise.sets}
    distance={exercise.targetDistanceKm}
    rest={exercise.rest || 90}
    onComplete={(times) => {
      // Save all interval times
    }}
  />;
}
```

## Example User Flow

### Interval Workout: 8×500m @ 90s rest

1. **Before Start:**
   ```
   Interval Training
   8 × 500m
   90s rest between sets
   
   [START WORKOUT]
   ```

2. **During Set 1:**
   ```
   Set 1 of 8
   Target: 500m
   
   [Stopwatch: 02:15]
   
   [COMPLETE SET]
   ```

3. **Rest Period:**
   ```
   Rest
   Next set: 500m
   
   [Countdown: 01:30]
   
   [SKIP REST] [END WORKOUT]
   ```

4. **During Set 2:**
   ```
   Set 2 of 8
   Target: 500m
   Previous: 02:15
   
   [Stopwatch: 01:45]
   
   [COMPLETE SET]
   ```

5. **After All Sets:**
   ```
   Workout Complete! 🎉
   
   Total: 8 sets × 500m = 4km
   Average pace: 4:30/km
   Total time: 18:45
   
   [Rate workout: 🔥🔥🔥🔥🔥]
   [SAVE & CONTINUE]
   ```

## Priority
**HIGH** - This is core functionality for running training programs.

## Estimated Effort
- Add rest field: 10 min
- Create IntervalTimer component: 2-3 hours
- Integrate into ExerciseDetail: 30 min
- Testing: 1 hour

**Total: ~4 hours**

