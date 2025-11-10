# 🏋️ Workout Generation Status

## ✅ COMPLETED

### 1. Running Workouts (`runGenerator.ts`)
**Status:** ✅ Fully Implemented

**Session Types:**
- ✅ Long Run (60-80 min, Zone 2)
- ✅ Intervals (6-8×500m, race pace, 90s rest)
- ✅ Tempo Run (4-6km, Zone 3, steady pace)
- ✅ Hill Repeats (6×200m, hard effort uphill)
- ✅ Recovery Run (3-4km, Zone 1, very easy)
- ✅ Fartlek (mixed pace play)
- ✅ Progression Run (5-6km, building pace)

**Features:**
- ✅ Automatic warm-up (10 min) and cool-down (5 min)
- ✅ Proper distance/duration parsing
- ✅ Intervals as circuit format (for IntervalTimer)
- ✅ Progressive overload (+2 intervals, +1-2km distance)

---

### 2. Strength Workouts (`programmeToDatabase.ts`)
**Status:** ✅ Fully Implemented

**Workout Splits:**
- ✅ Lower Body (Squat, Bulgarian Split Squat, RDL, Leg Press, Plank)
- ✅ Upper Body (Bench, Row, Shoulder Press, Lat Pulldown, Bicep Curl, Tricep Extension)
- ✅ Full Body (Deadlift, Overhead Press, Rows, Core)

**Features:**
- ✅ Personalized weight prescription (based on 5RM → 1RM calculation)
- ✅ Rep range-based programming:
  - Strength: 4-6 reps @ 80-85% 1RM
  - Hypertrophy: 8-12 reps @ 70-75% 1RM
  - Endurance: 12-15 reps @ 60-65% 1RM
- ✅ Warm-up sets (2×10-15 @ 30% 1RM)
- ✅ Exercise-specific weight adjustments (unilateral, isolation, machine)
- ✅ Programmatic notes (goal, intensity, technique cues)
- ✅ Session-level notes (workout purpose)
- ✅ Progressive overload:
  - +2 reps for strength exercises
  - +10 seconds for timed exercises (Plank)
  - Warm-ups stay the same

---

## ❌ TO IMPLEMENT

### 3. Cardio/Conditioning Workouts
**Status:** ❌ Placeholder Only

**Planned Session Types:**

#### **Race Simulation**
- Format: Circuit (4 rounds)
- Example: 1km run + 50m sled push + 500m SkiErg
- Rest: 3 min between rounds
- Effort: Hard
- Duration: 40-60 min

#### **Engine Work**
- Format: Intervals
- Example: 30 min mixed (RowErg, SkiErg, Assault Bike)
- Work/Rest: 2min on / 1min off
- Effort: Moderate
- Duration: 30-45 min

#### **HIIT Conditioning**
- Format: HIIT
- Example: 8 rounds: 30s SkiErg / 30s rest
- Effort: Hard
- Duration: 20-30 min

**Required Exercises:**
- RowErg / Rowing Machine
- SkiErg
- Assault Bike / Air Bike
- Sled Push / Sled Pull
- Farmer's Carry
- Sandbag Lunges
- Wall Balls
- Burpees
- Box Jumps

---

### 4. Recovery/Mobility Workouts
**Status:** ❌ Placeholder Only

**Planned Session Types:**

#### **Active Recovery**
- Format: Timed holds/movements
- Example: 20-30 min yoga, foam rolling, dynamic stretching
- Effort: Easy
- Duration: 20-30 min

#### **Mobility Work**
- Format: Structured mobility routine
- Example: Hip, shoulder, ankle mobility drills
- Effort: Easy
- Duration: 15-20 min

**Required Exercises:**
- Yoga Flow
- Foam Rolling (Quads, Hamstrings, IT Band, Back)
- Dynamic Stretching
- Hip Mobility Drills
- Shoulder Mobility Drills
- Ankle Mobility Drills
- Cat-Cow
- Thread the Needle
- 90/90 Hip Stretch

---

## 🎯 Implementation Priority

### Phase 1: Cardio Generator (HIGH PRIORITY)
**Why:** Users with "Cardio" focus area currently have empty workout days

**Steps:**
1. Create `src/services/generators/cardioGenerator.ts`
2. Implement 3 session types (Race Simulation, Engine Work, HIIT)
3. Update `generateCardioWorkout()` in `programmeToDatabase.ts`
4. Add cardio exercises to database (if missing)
5. Test circuit/HIIT timer integration
6. Implement progressive overload (+5-10% distance/duration, +1-2 rounds)

**Estimated Time:** 2-3 hours

---

### Phase 2: Recovery Generator (MEDIUM PRIORITY)
**Why:** Recovery days currently show "Exercises will populate soon"

**Steps:**
1. Create `src/services/generators/recoveryGenerator.ts`
2. Implement 2 session types (Active Recovery, Mobility)
3. Update `generateRecoveryWorkout()` in `programmeToDatabase.ts`
4. Add mobility/recovery exercises to database (if missing)
5. Test countdown timer integration (like Plank)
6. No progressive overload needed (recovery stays consistent)

**Estimated Time:** 1-2 hours

---

## 📊 Current Programme Structure

### Example 14-Day Programme:

| Day | Type | Status |
|-----|------|--------|
| Day 1 | Strength Lower | ✅ Working |
| Day 2 | Running Intervals | ✅ Working |
| Day 3 | Strength Upper | ✅ Working |
| Day 4 | Running Tempo | ✅ Working |
| Day 5 | Recovery | ❌ Empty |
| Day 6 | Running Long | ✅ Working |
| Day 7 | Recovery | ❌ Empty |
| Day 8 | Strength Lower | ✅ Working (Week 2) |
| Day 9 | Running Intervals | ✅ Working (Week 2) |
| Day 10 | Strength Upper | ✅ Working (Week 2) |
| Day 11 | Running Tempo | ✅ Working (Week 2) |
| Day 12 | Recovery | ❌ Empty |
| Day 13 | Running Long | ✅ Working (Week 2) |
| Day 14 | Recovery | ❌ Empty |

**Issue:** Days 5, 7, 12, 14 show "Exercises will populate soon"

---

## 🚀 Next Actions

1. **Immediate:** Implement `cardioGenerator.ts` for users with Cardio focus
2. **Short-term:** Implement `recoveryGenerator.ts` to fill rest days
3. **Testing:** Verify all workout types display correctly in UI
4. **Polish:** Ensure progressive overload works for all workout types

---

## 📝 Technical Notes

### Cardio Workouts:
- Use `block_type: "cardio"`
- Format as `circuit` (for multi-exercise rounds) or `hiit` (for single exercise intervals)
- Store `rounds`, `rest_between_rounds_s` at block level
- Each exercise: `distance_m`, `duration_sec`, `notes`

### Recovery Workouts:
- Use `block_type: "mobility"` or `block_type: "cardio"` (for active recovery)
- Each exercise: `duration_sec` (hold time), `notes` (instructions)
- No sets/reps, just timed holds
- Use countdown timer (like Plank)

---

**Last Updated:** 2025-01-10

