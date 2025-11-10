# 🏋️ Weight Prescription System

## Overview

The strength workout generator now **automatically prescribes kg values** for every exercise based on the user's onboarding questionnaire responses. This creates a truly personalized training programme.

---

## 📊 Data Source: Onboarding Questionnaire

During onboarding, users provide their **5-rep max (5RM)** for key lifts:

| Exercise | Weight Options (kg) |
|----------|-------------------|
| **Bench Press** | 20 / 40 / 60 / 80 / 100 / 120+ / Not sure |
| **Back Squat** | 20 / 40 / 60 / 80 / 100 / 120+ / Not sure |
| **Deadlift** | 20 / 40 / 60 / 80 / 100 / 120 / 140+ / Not sure |
| **Overhead Press** | 5 / 10 / 20 / 30 / 40 / 50 / 60+ / Not sure |

This data is stored in `clients.onboarding_answers`:
```json
{
  "bench5rm": "80",
  "squat5rm": "100",
  "deadlift5rm": "120",
  "ohp5rm": "40"
}
```

---

## 🧮 Calculation Method

### Step 1: Calculate 1RM from 5RM
```typescript
1RM = 5RM × 1.15
```

**Example:**
- User's squat 5RM = 100kg
- Estimated 1RM = 100 × 1.15 = **115kg**

### Step 2: Calculate Working Weight
```typescript
Working Weight = 1RM × Percentage
```

**Example:**
- For 4×6 @ 80% intensity:
- Working Weight = 115 × 0.80 = **92kg**

### Step 3: Round to Nearest 5kg
```typescript
Final Weight = Math.round(weight / 5) × 5
```

---

## 💪 Exercise Prescription by Rep Range

### STRENGTH (4-6 reps) → 80-85% 1RM
- **Goal:** Build maximal strength
- **Tempo:** Controlled eccentric, explosive concentric
- **Rest:** 2-3 minutes between sets
- **Examples:**
  - Back Squat: 4×6 @ 80kg
  - Bench Press: 4×6 @ 75kg

### HYPERTROPHY (8-10 reps) → 70-75% 1RM
- **Goal:** Muscle growth
- **Tempo:** 3-0-1 (3s down, 0s pause, 1s up)
- **Rest:** 60-90 seconds
- **Examples:**
  - Bulgarian Split Squat: 3×8 @ 50kg
  - Romanian Deadlift: 3×10 @ 85kg

### ENDURANCE (12-15 reps) → 60-65% 1RM
- **Goal:** Muscular endurance
- **Tempo:** Controlled, no momentum
- **Rest:** 45-60 seconds
- **Examples:**
  - Leg Press: 3×12 @ 110kg
  - Bicep Curl: 3×12 @ 12kg

---

## 📝 Notes System

Every exercise now includes a **detailed note** with:
1. **Training goal** (Strength/Hypertrophy/Endurance)
2. **Intensity percentage** (e.g., "80% 1RM")
3. **Technique cues** (e.g., "control the descent (3s)")
4. **Focus points** (e.g., "squeeze scapulae at top")

### Example Notes:

```typescript
// STRENGTH
"Strength - 80% 1RM, focus on depth and explosive drive"

// HYPERTROPHY
"Hypertrophy - Each leg, controlled 3-0-1 tempo, maintain upright torso"

// ENDURANCE
"Endurance - Full ROM, don't lock knees at top"

// WARM-UP
"Warm-up - Light weight, focus on form and depth"
```

---

## 🎯 Exercise-Specific Weight Adjustments

Some exercises require weight adjustments relative to the base lift:

### Lower Body
| Exercise | Base Lift | Adjustment | Reason |
|----------|-----------|------------|--------|
| Goblet Squat | Squat 5RM | 30% | Warm-up only |
| Bulgarian Split Squat | Squat 1RM | 60% | Unilateral (one leg) |
| Leg Press | Squat 1RM | 150% | Machine leverage |

### Upper Body
| Exercise | Base Lift | Adjustment | Reason |
|----------|-----------|------------|--------|
| Band Pull-Apart | N/A | Bodyweight | Warm-up activation |
| Bent Over Row | Bench 1RM | 90% | Similar push/pull strength |
| Lat Pulldown | Bench 1RM | 85% | Vertical pull typically lighter |
| Bicep Curl | Bench 1RM | 30% | Isolation, much lighter |
| Tricep Extension | Bench 1RM | 35% | Isolation, slightly heavier than biceps |

---

## 🔄 Progressive Overload (Week 2)

Week 2 automatically applies **+10% volume** to all exercises:

```typescript
// Week 1
Squat: 4×6 @ 92kg

// Week 2 (auto-generated)
Squat: 4×7 @ 92kg  // +1 rep
OR
Squat: 4×6 @ 97kg  // +5kg
```

The system alternates between:
- **Reps progression** (add 1-2 reps)
- **Weight progression** (add 5-10kg)

---

## 🧪 Example: Full Lower Body Workout

**User Profile:**
- Squat 5RM: 100kg → 1RM: 115kg
- Deadlift 5RM: 120kg → 1RM: 138kg

**Generated Workout:**

### Warm-up
- Goblet Squat: 2×10 @ **30kg**
  - *Warm-up - Light weight, focus on form and depth*

### Main Work
1. **Back Squat: 4×6 @ 92kg**
   - *Strength - 80% 1RM, focus on depth and explosive drive*

2. **Bulgarian Split Squat: 3×8 @ 48kg**
   - *Hypertrophy - Each leg, controlled 3-0-1 tempo, maintain upright torso*

3. **Romanian Deadlift: 3×10 @ 97kg**
   - *Hypertrophy - Feel the hamstring stretch, keep bar close to legs*

4. **Leg Press: 3×12 @ 112kg**
   - *Endurance - Full ROM, don't lock knees at top*

### Core Finisher
- Plank: 3 rounds × 45 seconds

---

## 🚀 Benefits

1. ✅ **Fully Personalized** - Every weight is calculated from user's actual strength
2. ✅ **Scientifically Based** - Uses proven 1RM formulas and percentage-based training
3. ✅ **Educational** - Notes explain WHY each weight is prescribed
4. ✅ **Progressive** - Week 2 automatically increases volume
5. ✅ **Safe** - Warm-ups use appropriate light weights
6. ✅ **Realistic** - Adjustments for unilateral/isolation exercises

---

## 🔧 Technical Implementation

### Code Location
`/src/services/programmeToDatabase.ts` → `generateStrengthWorkout()`

### Key Functions
```typescript
// Parse weight from onboarding string
parseWeight(value: string): number

// Calculate 1RM from 5RM
calculate1RM(fiveRM: number): number

// Calculate working weight
calculateWeight(fiveRM: number, percentage: number): number
```

### Database Storage
```sql
-- session_block_items table
INSERT INTO session_block_items (
  exercise_id,
  sets,
  reps,
  weight_kg,  -- ✅ NOW POPULATED!
  notes       -- ✅ Includes training goal + technique cues
)
```

---

## 📱 User Experience

### Before (Generic)
```
Squat
4 sets × 6 reps
```

### After (Personalized)
```
Squat
4 sets × 6 reps @ 92kg
💡 Strength - 80% 1RM, focus on depth and explosive drive
```

---

## 🎓 Next Steps

1. ✅ **Strength exercises** - DONE
2. 🔄 **Cardio/HYROX exercises** - Use bodyweight or equipment-based scaling
3. 🔄 **Recovery exercises** - Typically bodyweight or light resistance
4. 📊 **Progress tracking** - Compare prescribed vs. actual weights logged
5. 🔔 **Deload weeks** - Reduce intensity to 60-70% every 4 weeks

---

## 🧠 Training Philosophy

This system follows proven strength training principles:

1. **Specificity** - Weights match the user's current strength level
2. **Progressive Overload** - Week 2 increases volume by 10%
3. **Periodization** - Different rep ranges target different adaptations
4. **Individualization** - Based on actual 5RM data, not generic templates
5. **Safety** - Appropriate warm-ups and technique cues

---

**Result:** A truly personalized strength programme that adapts to each user's unique strength profile! 💪

