# ✅ Progressive Overload Fixes - Complete

## 🐛 Issues Fixed

### 1. ✅ Warm-ups Progressing (Should Stay Same)

**Problem:**
- Goblet Squat: 2×10 → 2×**12** ❌
- Band Pull-Apart: 2×15 → 2×**17** ❌

**Root Cause:**
The progression logic was applying +2 reps to ALL strength exercises, including warm-ups.

**Fix:**
Added warm-up detection logic in `programmeToDatabase.ts`:

```typescript
// Check if this is a warm-up block (skip progression for warm-ups)
const isWarmup = block.title?.toLowerCase().includes("warm") || 
                block.title?.toLowerCase().includes("activation");

// PROGRESSIVE OVERLOAD: +2 reps for ALL exercises (strength, hypertrophy, endurance)
// BUT NOT for warm-ups!
if (item.reps && block.block_type === "strength" && !isWarmup) {
  progressedReps = item.reps + 2; // +2 reps per week
}
```

**Result:**
- Goblet Squat: 2×10 → 2×10 ✅
- Band Pull-Apart: 2×15 → 2×15 ✅

---

### 2. ✅ Running Intervals Not Progressing

**Problem:**
- Intervals: 6×500m → 6×500m ❌ (should be 8×500m)

**Root Cause:**
The progression logic was checking `item.sets` and `block.block_type === "intervals"`, but:
1. Running intervals are stored as `block.rounds` (not `item.sets`)
2. The block type is `"cardio"` with `parameters.format = "circuit"` (not `"intervals"`)

**Fix:**
Added block-level progression for circuit rounds in `programmeToDatabase.ts`:

```typescript
// PROGRESSIVE OVERLOAD: +2 rounds for interval circuits
let progressedRounds = block.rounds;
if (block.parameters?.format === "circuit" && block.rounds) {
  progressedRounds = block.rounds + 2; // +2 intervals per week
  console.log(`📈 Interval progression: ${block.rounds} → ${progressedRounds} rounds`);
}

const { data: newBlock, error: blockError } = await supabase
  .from("session_blocks")
  .insert({
    session_id: newSession.id,
    block_type: block.block_type,
    title: block.title,
    rounds: progressedRounds, // Use progressed rounds
    parameters: progressedParams,
  })
```

**Result:**
- Intervals: 6×500m → **8×500m** ✅

---

### 3. ✅ Plank Display Showing "min" Instead of "sec"

**Problem:**
- Plank: 45 **min** ❌ (should be 45 **sec**)

**Root Cause:**
The `duration_sec` column stores:
- **Seconds** for strength exercises (e.g., 45 seconds for plank)
- **Minutes** for running exercises (e.g., 10 minutes for warm-up run)

This inconsistency caused the display logic to always show "min".

**Fix 1: `supabasePlans.ts`**
Added logic to detect exercise type and convert appropriately:

```typescript
// Prefer database columns over extra object
let durationMin = undefined;
if (item.duration_sec) {
  // Check if this is a cardio/running exercise (duration stored as minutes)
  // or a strength exercise (duration stored as seconds)
  if (exerciseType === "cardio" || modality === "running" || modality === "cardio") {
    durationMin = item.duration_sec; // Running: stored as minutes
  } else {
    // Strength exercises: stored as seconds, convert to minutes for display
    durationMin = item.duration_sec / 60;
  }
} else if (extra.duration) {
  durationMin = extra.duration;
}
```

**Fix 2: `Overview.tsx`**
Added smart display logic to show seconds when < 1 minute:

```typescript
if (exercise.durationMin) {
  // Display seconds if less than 1 minute, otherwise minutes
  if (exercise.durationMin < 1) {
    const seconds = Math.round(exercise.durationMin * 60);
    meta.push(`${seconds} sec`);
  } else {
    meta.push(`${Math.round(exercise.durationMin)} min`);
  }
}
```

**Result:**
- Plank: 45 **sec** ✅
- Long Run: 60 **min** ✅

---

## 🧪 Testing

To verify the fixes:

1. **Delete old plan:**
```sql
DELETE FROM plans WHERE client_id = 'YOUR_CLIENT_ID';
```

2. **Regenerate programme:**
- Go to `/onboarding-complete`
- Click "Let's Go 🚀"
- Wait for programme to generate

3. **Check Overview:**
- Day 1 (Week 1): Goblet Squat 2×10, Plank 45 sec
- Day 8 (Week 2): Goblet Squat 2×10 (unchanged), Plank 55 sec (+10 sec)
- Day 2 (Week 1): Intervals 6×500m
- Day 9 (Week 2): Intervals 8×500m (+2 rounds)

---

## 📊 Progressive Overload Summary

### Strength Exercises
- **Main Work (4-6 reps):** +2 reps per week
- **Hypertrophy (8-12 reps):** +2 reps per week
- **Endurance (12-15 reps):** +2 reps per week
- **Warm-ups:** NO progression ✅
- **Timed exercises (plank):** +10 seconds per week

### Running Workouts
- **Intervals:** +2 rounds per week
- **Long runs:** +1-2km per week
- **Tempo runs:** +5-10 min per week

---

## 🎯 Files Modified

1. **`src/services/programmeToDatabase.ts`**
   - Added warm-up detection logic
   - Added block-level interval progression
   - Fixed progressive overload for timed exercises

2. **`src/services/supabasePlans.ts`**
   - Fixed duration conversion (seconds vs minutes)
   - Added exercise type detection

3. **`src/pages/Overview.tsx`**
   - Added smart display logic (sec vs min)
   - Fixed rounding for minutes

---

## ✅ All Issues Resolved!

The progressive overload system now correctly:
1. ✅ Keeps warm-ups unchanged
2. ✅ Progresses intervals by +2 rounds
3. ✅ Displays plank as "45 sec" instead of "45 min"

