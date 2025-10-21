# 🏋️ Exercise Type Guide

## What to Put in the "Type" Column

Your Google Sheet's **Column C (Type)** should contain one of these values:

---

## 💪 **Standard Exercise Types**

### 1. **`weights`**
Use for exercises that involve external weight (dumbbells, barbells, machines, kettlebells, etc.)

**Examples:**
- ✅ Goblet Squat with dumbbell
- ✅ Barbell Bench Press
- ✅ Romanian Deadlift
- ✅ Seated Cable Row
- ✅ Dumbbell Shoulder Press
- ✅ Leg Press Machine
- ✅ Kettlebell Swings

**What to fill:**
- **Sets:** Number (e.g., 4)
- **Reps:** Number (e.g., 10)
- **Kg:** Weight in kilograms (e.g., 16)
- **Duration/Distance:** Leave empty
  
**In the app:**
- Shows **Sets × Reps** (e.g., 4 × 10)
- Shows **Target weight** (e.g., "Target: 16kg")
- Allows multiple weights per set (12kg → 13kg → 14kg)

---

### 2. **`bodyweight`**
Use for exercises using only your body weight (no external resistance)

**Examples:**
- ✅ Push-ups
- ✅ Pull-ups
- ✅ Dead Bug
- ✅ Plank
- ✅ Side Plank
- ✅ Bird Dog
- ✅ Burpees
- ✅ Air Squats
- ✅ Mountain Climbers

**What to fill:**
- **Sets:** Number (e.g., 3)
- **Reps:** Number (e.g., 12)
- **Kg:** Leave empty (no weight needed)
- **Duration/Distance:** Leave empty

**In the app:**
- Shows **Sets × Reps** (e.g., 3 × 12)
- Shows **"Bodyweight"** label
- No weight input field

---

### 3. **`cardio`**
Use for general cardiovascular/endurance exercises (non-running)

**Examples:**
- ✅ Rowing Machine
- ✅ SkiErg
- ✅ Bike/Cycling
- ✅ Swimming
- ✅ Jump Rope
- ✅ Elliptical
- ✅ Stair Climber

**What to fill:**
- **Sets/Reps/Kg:** Leave empty
- **Duration:** Minutes (e.g., 15)
- **Distance:** Kilometers (e.g., 3.0) - optional

**In the app:**
- Shows **Duration** (e.g., "15 min")
- Shows **Target distance** (e.g., "Target: 3.0km")
- You'll enter actual distance and time
- Countdown timer available if duration is set

---

### 4. **`running`** ⭐ NEW
Use specifically for running exercises (for Hyrox training and run-specific workouts)

**Examples:**
- ✅ 1km Run
- ✅ Interval Runs
- ✅ Tempo Run
- ✅ Easy Run
- ✅ Race Pace Run
- ✅ Hill Sprints

**What to fill:**
- **Sets/Reps/Kg:** Leave empty
- **Duration:** Target minutes (e.g., 5)
- **Distance:** Kilometers (e.g., 1.0)

**In the app:**
- Shows **Distance** prominently (e.g., "1.0km")
- Shows **Target time** (e.g., "Target: 5 min")
- Displays with a running icon 🏃
- Countdown timer available

**Why separate from cardio?**
For Hyrox training, running is a core component. Tracking it separately allows better analysis of your running performance versus other cardio like rowing or SkiErg.

---

### 5. **`mobility`**
Use for warmup, cooldown, stretching, and mobility work

**Examples:**
- ✅ Foam Rolling
- ✅ Dynamic Warmup
- ✅ Hip Mobility Circuit
- ✅ Shoulder Mobility
- ✅ Cool Down Stretch
- ✅ Yoga Flow

**What to fill:**
- **Sets/Reps/Kg:** Leave empty
- **Duration:** Minutes (e.g., 10)
- **Notes:** Description of the mobility work

**In the app:**
- Shows **Duration** (e.g., "10 min")
- Shows **"Mobility"** label
- NO PB tracking (not competitive)
- Countdown timer available

---

## 🔥 **Grouped Workout Types**

### 6. **`hiit`**
High-Intensity Interval Training

**Example Google Sheet Row:**
| Day | Exercise | Type | Sets | Reps | Kg | PB | Duration | Distance | Notes | Media |
|-----|----------|------|------|------|----|----|----------|----------|-------|-------|
| 1 | Sled Push | hiit | 8 | | | | 20s/10s | | Work 20s, Rest 10s | |

**What to fill:**
- **Sets:** Total intervals/rounds (e.g., 8)
- **Duration or Notes:** Work/Rest ratio (e.g., "20s/10s")
- **Notes:** Description of the exercise

**In the app:**
- Hot pink border (#FF00B2)
- Shows intervals with work/rest countdown
- Start/pause/restart/complete buttons

---

### 7. **`circuit`**
Circuit training with multiple exercises per round

**Structure:**
1. **Header row:** `type = "circuit"`
2. **Child rows:** `type = "circuit_exercise"`

**Example:**
| Day | Exercise | Type | Sets | Reps | Kg | Duration | Notes |
|-----|----------|------|------|------|----|----|-------|
| 1 | CIRCUIT: Lower Body | circuit | 3 | | | | 3 rounds total |
| 1 | Goblet Squat | circuit_exercise | | 12 | 16 | | |
| 1 | Walking Lunges | circuit_exercise | | 10 | 14 | | |
| 1 | Box Step-ups | circuit_exercise | | 12 | | | |

**In the app:**
- Orange/amber border (#FFB74D)
- Shows all exercises with round-tracking circles
- Tap exercise row to mark round complete
- Rest timer between rounds

---

### 8. **`amrap`**
As Many Rounds As Possible

**Structure:**
1. **Header row:** `type = "amrap"`
2. **Child rows:** `type = "amrap_exercise"`

**Example:**
| Day | Exercise | Type | Sets | Reps | Kg | Duration | Distance | Notes |
|-----|----------|------|------|------|----|----|----------|-------|
| 1 | AMRAP: Conditioning | amrap | | | | 12 | | 12 min time cap |
| 1 | Row Erg | amrap_exercise | | 1 | | 1 | 0.3 | [300m] |
| 1 | Burpee Broad Jumps | amrap_exercise | | 10 | | | | |
| 1 | Wall Balls | amrap_exercise | | 15 | 6 | | | 6kg ball |

**In the app:**
- Bright green border (#00E676)
- Shows countdown timer (time cap)
- Lists all exercises to complete each round
- Pause/complete early buttons

---

### 9. **`intro`** (Optional)
Daily workout overview/explanation card

**Example:**
| Day | Exercise | Type | Notes |
|-----|----------|------|-------|
| 1 | Conditioning Focus | intro | Today we work on fitness level for Hyrox competition. Focus on pacing. |

**In the app:**
- Shows at TOP of Today page
- Yellow border with clipboard icon
- Larger text for readability
- Not clickable - just informational

---

## 📊 Quick Reference Table

| Exercise Type | Sets | Reps | Kg | Duration | Distance | Icon | Example |
|--------------|------|------|-------|----------|----------|------|---------|
| **weights** | ✅ | ✅ | ✅ | ❌ | ❌ | 🏋️ | Dumbbell Press |
| **bodyweight** | ✅ | ✅ | ❌ | ❌ | ❌ | 🏋️ | Push-ups |
| **cardio** | ❌ | ❌ | ❌ | ✅ | ✅ | ⏱️ | SkiErg |
| **running** | ❌ | ❌ | ❌ | ✅ | ✅ | 🏃 | 1km Run |
| **mobility** | ❌ | ❌ | ❌ | ✅ | ❌ | 🤸 | Warmup |
| **hiit** | ✅ | ❌ | ❌ | ✅ | ❌ | ⚡ | Sled Push |
| **circuit** | ✅ | ❌ | ❌ | ❌ | ❌ | 🔁 | Lower Body Circuit |
| **amrap** | ❌ | ❌ | ❌ | ✅ | ❌ | 🎯 | Conditioning AMRAP |
| **intro** | ❌ | ❌ | ❌ | ❌ | ❌ | 📋 | Daily Overview |

---

## 🎨 Color Scheme

| Type | Border Color | Usage |
|------|-------------|--------|
| Standard types | Default gray | weights, cardio, running, bodyweight, mobility |
| HIIT | Hot Pink (#FF00B2) | High intensity intervals |
| Circuit | Amber (#FFB74D) | Circuit training |
| AMRAP | Bright Green (#00E676) | AMRAP workouts |
| Completed | Yellow (#FFCC00) | Any completed exercise |

---

## 💡 Common Questions

### Q: Running vs Cardio - which should I use?
**A:** Use **`running`** for all running workouts (1km runs, tempo runs, intervals on track/road/treadmill). Use **`cardio`** for rowing, SkiErg, bike, swimming, etc.

### Q: What about weighted bodyweight exercises?
**A:** If you add external weight (weighted vest, holding dumbbells), use **`weights`**

Examples:
- Weighted Pull-ups → `weights`
- Weighted Dips → `weights`
- Goblet Squats → `weights`

### Q: Should warmup be mobility or bodyweight?
**A:** Use **`mobility`** for all warmup, cooldown, and stretching. This removes PB tracking and sets appropriate timer presets.

### Q: Can I mix types in a circuit?
**A:** Yes! Circuit child exercises can have different types (weights, bodyweight, running, etc.)

---

## 🔄 Type is Case-Insensitive

You can write:
- `running` or `Running` or `RUNNING`
- `weights` or `Weights` or `WEIGHTS`
- `mobility` or `Mobility` or `MOBILITY`

All will work! (But lowercase is recommended for consistency)

---

## 📝 Best Practices for Hyrox Training

For a typical Hyrox training day, you might use:

```
Day 1 - Hyrox Simulation

intro: "Conditioning Focus" - Explain the workout structure
running: "1km Run" - 1.0km in 5 min
weights: "Sled Push" - Distance or time
running: "1km Run" - 1.0km in 5 min
weights: "Farmers Carry" - Distance
running: "1km Run" - 1.0km in 5 min
amrap: "Burpee Broad Jumps" - 15 min AMRAP
mobility: "Cool Down" - 10 min stretch
```

This gives you:
- Clear workout overview (intro)
- Distinct tracking for running vs functional fitness
- Proper cooldown/recovery work

---

**Happy Training! 🏆**
