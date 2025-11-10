# 🧪 Testing Weight Prescription System

## Quick Test Checklist

### 1. **Test User Onboarding** ✅
Navigate to: `http://localhost:8081/register`

**Create Test User:**
- Name: Test Athlete
- Email: test@athlete.com
- Password: test123

**Complete Onboarding:**
- Sex: Male
- Age: 30
- Event: Training for "HYROX London", 8 weeks away
- **Strength (IMPORTANT - these determine weights):**
  - Bench Press: **80kg** (5 reps)
  - Back Squat: **100kg** (5 reps)
  - Deadlift: **120kg** (5 reps)
  - Overhead Press: **40kg** (5 reps)
- Running: 3-4 runs/week, intervals: Yes, hills: Yes
  - 5km: 20-25min
  - 10km: 45-50min
- Cardio: 2 sessions/week, RowErg + SkiErg, 20-40min, Both intervals and Zone 2
- Mobility: 2 sessions/week, Yoga: Yes
- Competition: 2-3 times, Finished

**Expected Athlete Profile:**
- Running Score: ~70
- Strength Score: ~65
- Cardio Score: ~70

---

### 2. **Customize Programme** ✅
Navigate to: `http://localhost:8081/program-customize`

**Select:**
- Focus Areas: ✅ Running, ✅ Strength, ✅ Cardio
- Training Days: **5 days/week**
- Runs per week: **3**
- Hills/Sprints: **Yes**
- PT Check-ins: **No**
- Hyrox Equipment: ✅ Sled, ✅ RowErg, ✅ SkiErg

**Save & Continue**

---

### 3. **View Programme Preview** ✅
Navigate to: `http://localhost:8081/program-preview`

**Verify:**
- ✅ Typewriter intro text appears
- ✅ 14-day visual plan (2 rows of 7 days)
- ✅ 5 training days per week (2 rest days)
- ✅ Icons for running, strength, cardio
- ✅ Methodology cards scroll horizontally

**Click "Let's Go"**

---

### 4. **Complete Onboarding** ✅
Navigate to: `http://localhost:8081/onboarding-complete`

**Verify:**
- ✅ Success message
- ✅ Strava/Health Connect cards
- ✅ "Let's Go 🚀" button at bottom

**Click "Let's Go 🚀"**

---

### 5. **Programme Builder** ✅
Navigate to: `http://localhost:8081/programme-builder`

**Watch for:**
- ✅ Animated loader
- ✅ Progress bar
- ✅ Text updates:
  1. "Analysing your training goals..."
  2. "Calculating optimal training volume..."
  3. "Selecting exercises based on your equipment..."
  4. "Building your first 2-week block..."
  5. "Adding progressive overload for Week 2..."
  6. "Programme ready!"

**Check Browser Console:**
```javascript
🚀 Creating plan in database...
💪 Strength data: { bench5rm: 80, squat5rm: 100, deadlift5rm: 120, ohp5rm: 40 }
💪 Generating strength workout: Strength Lower
✅ Plan created: [plan-id]
```

**Auto-navigates to Programme Overview**

---

### 6. **Programme Overview** ✅
Navigate to: `http://localhost:8081/programme-overview`

**Verify Week 1 - Day 1 (Example: Lower Body):**

Should see something like:
```
Day 1 - Monday
💪 Strength Lower
🔴 Hard

Main Work:
- Back Squat: 4×6 @ 92kg
- Bulgarian Split Squat: 3×8 @ 48kg
- Romanian Deadlift: 3×10 @ 97kg
- Leg Press: 3×12 @ 138kg
```

**Expected Calculations (for our test user):**
- Bench 5RM: 80kg → 1RM: 92kg
- Squat 5RM: 100kg → 1RM: 115kg
- Deadlift 5RM: 120kg → 1RM: 138kg
- OHP 5RM: 40kg → 1RM: 46kg

**Week 1 Lower Body Weights:**
- Back Squat: 115 × 0.80 = **92kg** ✅
- Bulgarian Split Squat: 115 × 0.70 × 0.6 = **48kg** ✅
- Romanian Deadlift: 138 × 0.70 = **97kg** ✅
- Leg Press: 115 × 0.65 × 1.5 = **112kg** ✅

**Click "Start Training 🚀"**

---

### 7. **Today Page - View Exercise Details** ✅
Navigate to: `http://localhost:8081/today`

**Click on first exercise (e.g., "Back Squat")**

**Verify Exercise Detail Page:**

```
Back Squat
💪 92kg

📝 Strength - 80% 1RM, focus on depth and explosive drive

[Exercise video/media if available]

Sets:
□ Set 1: 6 reps @ 92kg
□ Set 2: 6 reps @ 92kg
□ Set 3: 6 reps @ 92kg
□ Set 4: 6 reps @ 92kg
```

**Check Console for Notes Override:**
```javascript
📝 Using programmatic notes for Back Squat: {
  programmatic: "Strength - 80% 1RM, focus on depth and explo...",
  default: "A compound lower body exercise targeting quads...",
  source: "session_block_items (OVERRIDE)"
}
```

---

### 8. **Test Different Exercises** ✅

#### Upper Body Day (e.g., Day 2)

**Expected:**
- Bench Press: 4×6 @ **74kg** (92 × 0.80)
- Bent Over Row: 4×8 @ **62kg** (92 × 0.75 × 0.9)
- DB Shoulder Press: 3×10 @ **32kg** (46 × 0.70)
- Lat Pulldown: 3×10 @ **54kg** (92 × 0.70 × 0.85)
- Bicep Curl: 3×12 @ **17kg** (92 × 0.60 × 0.3)
- Tricep Extension: 3×12 @ **19kg** (92 × 0.60 × 0.35)

**Verify Notes:**
- Bench: "Strength - 80% 1RM, control the descent (3s), explosive press"
- Row: "Strength/Hypertrophy - Pull to ribs, squeeze scapulae at top, 2s hold"
- Shoulder Press: "Hypertrophy - Full ROM, controlled tempo, avoid arching back"
- Lat Pulldown: "Hypertrophy - Pull to upper chest, squeeze lats, slow eccentric"
- Bicep Curl: "Endurance - Controlled tempo, no swinging, squeeze at top"
- Tricep Extension: "Endurance - Elbows stay in position, full extension, control the weight"

---

### 9. **Test Week 2 Progressive Overload** ✅

Navigate to Day 8-14 in Programme Overview

**Verify Week 2 has +10% volume:**

**Example: Back Squat**
- Week 1: 4×6 @ 92kg
- Week 2: 4×7 @ 92kg (OR 4×6 @ 97kg)

**Verify notes are identical** (progressive overload is in reps/weight, not notes)

---

### 10. **Test Edge Cases** ⚠️

#### User selects "Not sure" for lifts:
**Expected:** Default to moderate weights (40kg bench, 60kg squat, 80kg deadlift, 20kg OHP)

#### User selects lowest weights (20kg bench, 20kg squat):
**Expected:** 
- Bench 1RM: 23kg
- Squat 1RM: 23kg
- Working weights scale proportionally

#### User selects highest weights (120+ bench, 120+ squat):
**Expected:**
- Bench 1RM: 138kg
- Squat 1RM: 138kg
- Working weights: 110kg bench @ 80%, 110kg squat @ 80%

---

## 🐛 Common Issues & Fixes

### Issue 1: Weights not showing
**Symptoms:** Exercise shows "4×6" but no kg value

**Debug:**
1. Check browser console for: `💾 Inserting session_block_item: { weight_kg: XX }`
2. Check database: `SELECT weight_kg FROM session_block_items WHERE exercise_id = 'xxx'`
3. Verify `supabasePlans.ts` query includes `weight_kg` column

**Fix:** Ensure `item.weight_kg` is populated in `programmeToDatabase.ts`

---

### Issue 2: Default notes showing instead of programmatic notes
**Symptoms:** Seeing generic exercise description instead of "Strength - 80% 1RM..."

**Debug:**
1. Check console for: `📝 Using programmatic notes for [exercise]`
2. Check database: `SELECT notes FROM session_block_items WHERE id = 'xxx'`
3. Verify notes were inserted: Should NOT be null

**Fix:** Ensure all `supabase.from("session_block_items").insert()` calls include `notes: "..."`

---

### Issue 3: Incorrect weight calculations
**Symptoms:** Weights seem too high or too low

**Debug:**
1. Check console: `💪 Strength data: { bench5rm: XX, squat5rm: XX }`
2. Verify onboarding data: Check `clients.onboarding_answers` in Supabase
3. Manual calculation:
   - 1RM = 5RM × 1.15
   - Working Weight = 1RM × Percentage
   - Example: 100kg squat 5RM → 115kg 1RM → 92kg @ 80%

**Fix:** Ensure `parseWeight()` correctly extracts number from string (e.g., "100", "120+")

---

### Issue 4: Programme not generating
**Symptoms:** Stuck on Programme Builder loader, or redirects to login

**Debug:**
1. Check console for errors
2. Verify user is authenticated: `localStorage.getItem("frank_rock_user")`
3. Check `clients.onboarding_answers` exists in database

**Fix:** Ensure user completed onboarding and data was saved to Supabase

---

## 📊 Database Verification Queries

### Check if weights were inserted:
```sql
SELECT 
  e.name,
  sbi.sets,
  sbi.reps,
  sbi.weight_kg,
  sbi.notes
FROM session_block_items sbi
JOIN exercises e ON e.id = sbi.exercise_id
JOIN session_blocks sb ON sb.id = sbi.block_id
JOIN sessions s ON s.id = sb.session_id
JOIN plan_days pd ON pd.id = s.plan_day_id
WHERE pd.plan_id = 'YOUR_PLAN_ID'
ORDER BY pd.day_index, sbi.item_order;
```

### Check onboarding data:
```sql
SELECT 
  name,
  onboarding_answers->>'bench5rm' as bench,
  onboarding_answers->>'squat5rm' as squat,
  onboarding_answers->>'deadlift5rm' as deadlift,
  onboarding_answers->>'ohp5rm' as ohp
FROM clients
WHERE email = 'test@athlete.com';
```

### Check programmatic notes:
```sql
SELECT 
  e.name,
  e.notes as default_notes,
  sbi.notes as programmatic_notes,
  CASE 
    WHEN sbi.notes IS NOT NULL THEN '✅ OVERRIDE'
    ELSE '⚠️ USING DEFAULT'
  END as status
FROM session_block_items sbi
JOIN exercises e ON e.id = sbi.exercise_id
WHERE sbi.notes IS NOT NULL OR e.notes IS NOT NULL;
```

---

## ✅ Success Criteria

### All tests pass if:

1. ✅ Onboarding captures 5RM data correctly
2. ✅ Programme Builder reads onboarding data
3. ✅ Console logs show: `💪 Strength data: { bench5rm: 80, squat5rm: 100... }`
4. ✅ All strength exercises have `weight_kg` populated
5. ✅ Weights match expected calculations (±5kg rounding)
6. ✅ All exercises have programmatic notes
7. ✅ Notes include training goal + intensity + technique cues
8. ✅ Console shows: `📝 Using programmatic notes for [exercise]`
9. ✅ Week 2 shows +10% volume progression
10. ✅ Exercise Detail page displays weight and notes correctly

---

## 🎯 Next Steps After Testing

1. **Test with different user profiles:**
   - Beginner (20kg bench, 40kg squat)
   - Intermediate (60kg bench, 80kg squat)
   - Advanced (100kg bench, 120kg squat)

2. **Verify progressive overload:**
   - Complete Week 1
   - Check Week 2 has increased volume

3. **Test edge cases:**
   - "Not sure" selections
   - Very low weights
   - Very high weights (120+)

4. **User feedback:**
   - Are weights appropriate?
   - Are notes helpful?
   - Is progression realistic?

---

**Happy Testing! 🚀**

