# 🏋️ Exercise Type Guide

## What to Put in the "Type" Column

Your Google Sheet's **Column C (Type)** should contain one of these three values:

---

## 1. **`weights`**
Use for exercises that involve external weight (dumbbells, barbells, machines, kettlebells, etc.)

### Examples:
- ✅ Goblet Squat with dumbbell
- ✅ Barbell Bench Press
- ✅ Romanian Deadlift
- ✅ Seated Cable Row
- ✅ Dumbbell Shoulder Press
- ✅ Leg Press Machine
- ✅ Kettlebell Swings

### What to fill:
- **Sets:** Number (e.g., 4)
- **Reps:** Number (e.g., 10)
- **Kg:** Weight in kilograms (e.g., 16)
- **Duration/Distance:** Leave empty
  
### In the app:
- Shows **Sets × Reps** (e.g., 4 × 10)
- Shows **Target weight** (e.g., "Suggested: 16kg")
- You'll enter the weight you actually used

---

## 2. **`bodyweight`**
Use for exercises using only your body weight (no external resistance)

### Examples:
- ✅ Push-ups
- ✅ Pull-ups
- ✅ Dead Bug
- ✅ Plank
- ✅ Side Plank
- ✅ Bird Dog
- ✅ Burpees
- ✅ Air Squats
- ✅ Mountain Climbers

### What to fill:
- **Sets:** Number (e.g., 3)
- **Reps:** Number or time (e.g., 12 or "30s")
- **Kg:** Leave empty (no weight needed)
- **Duration/Distance:** Leave empty

### In the app:
- Shows **Sets × Reps** (e.g., 3 × 12)
- Shows **"Bodyweight Exercise"** label
- No weight input field (just RPE and notes)

---

## 3. **`cardio`**
Use for cardiovascular/endurance exercises

### Examples:
- ✅ Running
- ✅ Rowing Machine
- ✅ SkiErg
- ✅ Bike/Cycling
- ✅ Swimming
- ✅ Jump Rope
- ✅ Elliptical
- ✅ Stair Climber

### What to fill:
- **Sets/Reps/Kg:** Leave empty
- **Duration:** Minutes (e.g., 36)
- **Distance:** Kilometers (e.g., 6.0)

### In the app:
- Shows **Duration** (e.g., "36 min")
- Shows **Target distance** (e.g., "Distance: 6.0km")
- You'll enter actual distance and time
- Stopwatch/countdown timer available

---

## Quick Reference Table

| Exercise Type | Sets | Reps | Kg | Duration | Distance | Example |
|--------------|------|------|-------|----------|----------|---------|
| **weights** | ✅ | ✅ | ✅ | ❌ | ❌ | Dumbbell Press |
| **bodyweight** | ✅ | ✅ | ❌ | ❌ | ❌ | Push-ups |
| **cardio** | ❌ | ❌ | ❌ | ✅ | ✅ | Running |

---

## Common Questions

### Q: What about weighted bodyweight exercises?
**A:** If you add external weight (like a weighted vest or holding dumbbells), use **`weights`**

Examples:
- Weighted Pull-ups → `weights`
- Weighted Dips → `weights`
- Goblet Squats → `weights`

### Q: What about exercises with light resistance bands?
**A:** It depends:
- Light bands for activation → `bodyweight`
- Heavy bands as main resistance → `weights`

### Q: What about circuit training or HIIT?
**A:** Break it down by exercise type:
- Kettlebell Swings → `weights`
- Jump Rope → `cardio`
- Burpees → `bodyweight`

### Q: What about yoga or stretching?
**A:** Use `bodyweight` with:
- Sets: 1
- Reps: "10 min" (put time in the name or notes)

---

## How It Looks in the App

### Weights Exercise Card:
```
🏋️ Goblet Squat
5 × 12        Target: 16kg
```

### Bodyweight Exercise Card:
```
🏋️ Dead Bug
3 × 12        Bodyweight
```

### Cardio Exercise Card:
```
⏱️ Row-Bike-SkiErg
36 min        Target: 6.0km
```

---

## Type is Case-Insensitive

You can write:
- `weights` or `Weights` or `WEIGHTS`
- `cardio` or `Cardio` or `CARDIO`
- `bodyweight` or `Bodyweight` or `BODYWEIGHT`

All will work! (But lowercase is recommended for consistency)

---

## Converting Your Existing Data

If you already have data with `strength` as the type:
1. Find & Replace: `strength` → `weights`
2. Review exercises that are actually bodyweight and change them to `bodyweight`

That's it! Your app will automatically recognize the new types.

