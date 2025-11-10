# 📝 Exercise Notes Priority System

## Overview

The app uses a **two-tier notes system** where **programmatic notes ALWAYS override default exercise notes**. This ensures that workout-specific instructions (like intensity, tempo, and technique cues) are always displayed to the user.

---

## 🏗️ Architecture

### 1. **Database Structure**

```
exercises table
├── id
├── name
└── notes (DEFAULT notes - generic exercise description)

session_block_items table
├── id
├── exercise_id (FK → exercises.id)
├── sets
├── reps
├── weight_kg
└── notes (PROGRAMMATIC notes - workout-specific instructions)
```

### 2. **Priority Logic**

```typescript
// In supabasePlans.ts - getDayExercises()
const finalNotes = item.notes || ex.notes || undefined;
//                  ↑ PRIORITY 1   ↑ PRIORITY 2
//                  Programmatic    Default
```

**Priority Order:**
1. ✅ **`session_block_items.notes`** (Programmatic) - HIGHEST PRIORITY
2. ⚠️ **`exercises.notes`** (Default) - Fallback only if programmatic notes are empty
3. ❌ **`undefined`** - No notes available

---

## 📊 Examples

### Example 1: Strength Exercise with Programmatic Notes

**Database:**
```sql
-- exercises table
id: "abc123"
name: "Back Squat"
notes: "A compound lower body exercise targeting quads, glutes, and hamstrings."

-- session_block_items table
exercise_id: "abc123"
sets: 4
reps: 6
weight_kg: 92
notes: "Strength - 80% 1RM, focus on depth and explosive drive"
```

**Result Displayed to User:**
```
Back Squat
4 sets × 6 reps @ 92kg
💡 Strength - 80% 1RM, focus on depth and explosive drive
```

✅ **Programmatic notes override default notes**

---

### Example 2: Exercise Without Programmatic Notes

**Database:**
```sql
-- exercises table
id: "def456"
name: "Plank"
notes: "Core stability exercise. Maintain neutral spine."

-- session_block_items table
exercise_id: "def456"
sets: 3
reps: null
duration_sec: 45
notes: null  -- No programmatic notes
```

**Result Displayed to User:**
```
Plank
3 rounds × 45 seconds
💡 Core stability exercise. Maintain neutral spine.
```

✅ **Default notes used as fallback**

---

### Example 3: Running Interval with Programmatic Notes

**Database:**
```sql
-- exercises table
id: "ghi789"
name: "Running"
notes: "Cardiovascular endurance exercise."

-- session_block_items table
exercise_id: "ghi789"
sets: 8
reps: 1
distance_m: 500
rest_sec: 90
notes: "Intervals - 85-90% effort, focus on maintaining pace consistency"
```

**Result Displayed to User:**
```
Running Intervals
8 × 500m (90s rest)
💡 Intervals - 85-90% effort, focus on maintaining pace consistency
```

✅ **Programmatic notes provide workout-specific guidance**

---

## 🎯 Benefits

### 1. **Personalization**
- Each workout can have unique instructions based on:
  - User's strength level (e.g., "80% 1RM")
  - Training phase (Strength/Hypertrophy/Endurance)
  - Technique focus (e.g., "3-0-1 tempo")

### 2. **Context-Aware Coaching**
- Same exercise, different contexts:
  - **Warm-up:** "Light weight, focus on form"
  - **Main work:** "80% 1RM, explosive drive"
  - **Finisher:** "High reps, controlled tempo"

### 3. **Progressive Overload Tracking**
- Week 1: "4×6 @ 80%"
- Week 2: "4×7 @ 80%" (programmatic notes update automatically)

### 4. **Safety & Technique**
- Critical cues always visible:
  - "Keep elbows stable"
  - "Don't lock knees at top"
  - "Squeeze scapulae at top"

---

## 🔍 Debugging

### Console Logs

When programmatic notes override default notes, you'll see:

```javascript
📝 Using programmatic notes for Back Squat: {
  programmatic: "Strength - 80% 1RM, focus on depth and explo...",
  default: "A compound lower body exercise targeting quads...",
  source: "session_block_items (OVERRIDE)"
}
```

### Verification Query

```sql
-- Check if programmatic notes exist
SELECT 
  e.name,
  e.notes as default_notes,
  sbi.notes as programmatic_notes,
  sbi.weight_kg,
  sbi.sets,
  sbi.reps
FROM session_block_items sbi
JOIN exercises e ON e.id = sbi.exercise_id
WHERE sbi.block_id = 'your-block-id';
```

---

## 📝 Note Format Standards

### Strength Exercises

```
[Goal] - [Intensity] [1RM%], [Technique Cue 1], [Technique Cue 2]
```

**Examples:**
- `"Strength - 80% 1RM, control the descent (3s), explosive press"`
- `"Hypertrophy - Each leg, controlled 3-0-1 tempo, maintain upright torso"`
- `"Endurance - Full ROM, don't lock knees at top"`
- `"Warm-up - Light weight, focus on form and depth"`

### Running Exercises

```
[Session Type] - [Effort %], [Focus Area]
```

**Examples:**
- `"Intervals - 85-90% effort, focus on maintaining pace consistency"`
- `"Long Run - 65-70% effort, conversational pace, build endurance"`
- `"Tempo - 80-85% effort, sustained hard pace, lactate threshold"`
- `"Recovery - 50-60% effort, easy conversational pace"`

### Cardio/HYROX Exercises

```
[Format] - [Intensity], [Technique Focus]
```

**Examples:**
- `"AMRAP - Max effort, maintain form under fatigue"`
- `"EMOM - Controlled pace, consistent output each minute"`
- `"Chipper - Steady pace, break up reps strategically"`

---

## 🛠️ Implementation Details

### Code Location

**File:** `/src/services/supabasePlans.ts`

**Function:** `getDayExercises(dayId: string)`

**Lines:** 347-361

```typescript
// Prioritize programmatic notes from session_block_items over default exercise notes
const finalNotes = item.notes || ex.notes || undefined;
if (item.notes && ex.notes && item.notes !== ex.notes) {
  console.log(`📝 Using programmatic notes for ${ex.name}:`, {
    programmatic: item.notes.substring(0, 50) + '...',
    default: ex.notes.substring(0, 50) + '...',
    source: 'session_block_items (OVERRIDE)'
  });
}

const exerciseObj = {
  id: String(item.id),
  name: extra.custom_name || ex.name,
  type: exerciseType,
  notes: finalNotes, // Programmatic notes ALWAYS override default notes
  // ... other properties
};
```

---

## 🔄 Data Flow

```
1. Programme Generator (programmeToDatabase.ts)
   ↓
   Generates workout with programmatic notes
   ↓
2. Database (session_block_items.notes)
   ↓
   Stores: "Strength - 80% 1RM, focus on depth..."
   ↓
3. Fetch Function (supabasePlans.ts)
   ↓
   Prioritizes: item.notes || ex.notes
   ↓
4. UI (ExerciseDetail.tsx)
   ↓
   Displays: exercise.notes
   ↓
5. User sees programmatic notes ✅
```

---

## ✅ Quality Checklist

When generating workouts, ensure:

- [ ] Every exercise has programmatic notes
- [ ] Notes include training goal (Strength/Hypertrophy/Endurance)
- [ ] Notes include intensity percentage (for strength) or effort level (for cardio)
- [ ] Notes include 1-2 technique cues
- [ ] Notes are concise (< 100 characters)
- [ ] Notes are actionable (tell user WHAT to do)
- [ ] Notes are educational (explain WHY)

---

## 🚀 Future Enhancements

1. **AI-Generated Notes** - Use user's form feedback to generate personalized cues
2. **Video Cues** - Link notes to specific timestamps in exercise videos
3. **Voice Coaching** - Read notes aloud during workout
4. **Progress Notes** - "Last week: 90kg. This week: 92kg (+2kg)"
5. **Injury Prevention** - "Feeling knee pain? Reduce depth to parallel"

---

**Result:** Every exercise now has context-aware, personalized coaching notes that adapt to the user's programme! 💪

