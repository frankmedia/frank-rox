# 🏋️ Training Day Setup with Automatic Rotation

Your app uses **Training Day Numbers** (1, 2, 3...) with **automatic rotation** - perfect for repeating programs!

## 🔄 Automatic Rotation

The app **automatically loops** your training cycle:

- **6-day program**: Day 1 → 2 → 3 → 4 → 5 → 6 → **back to Day 1** ↻
- **12-day program**: Day 1 → 2 → ... → 12 → **back to Day 1** ↻
- **Any length works!** The app detects your max day and rotates

**On Day 6?** Click **→** and you're back to **Day 1** automatically! 🎯

## ✅ Benefits:
- **Automatic program loops** - Never manually reset to Day 1
- **Skip days without issues** - Missed Day 3? Just do it tomorrow
- **No calendar dependency** - Work out any day, any time
- **Track progress** - See "Day 3 / 6" to know where you are in the cycle

---

## 📊 Google Sheet Structure

### Column A: Use Day Numbers

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| **Day** | **Exercise** | **Type** | **Sets** | **Reps** | **Kg** | **Personal Best** | **Duration** | **Distance** | **Notes** | **Media URL** |
| 1 | Goblet Squat | weights | 5 | 12 | 16 | | | | Slow 3s down • pause • 1s up | https://... |
| 1 | Step-Ups | weights | 4 | 10 | 24 | | | | Full foot on box | https://... |
| 1 | Dead Bug | bodyweight | 3 | 12 | | | | | Lower back flat | https://... |
| 2 | Row-Bike-SkiErg | cardio | | | | 6:00 | 36 | 6.0 | Easy nasal breathing | https://... |
| 2 | Calf Raises | weights | 3 | 20 | 10 | | | | Slow tempo | https://... |
| 3 | Seated DB Shoulder Press | weights | 4 | 10 | 32 | | | | Core braced | https://... |

### Day Format:
- Use: `1`, `2`, `3`, `4`, ... `99`
- **Simple numbers** (1, 2, 3... not 01, 02, 03)
- No spaces or extra characters

---

## 🎯 How It Works in the App

### 1. **Training Day Selector**
At the top of the home page, you'll see:
```
Training Day: [←] [Day 1 ▼] [→]
```

- **← Button** - Go to previous training day
- **Dropdown** - Jump to any training day (01-99)
- **→ Button** - Go to next training day

### 2. **Automatic Filtering**
The app automatically shows only exercises for the selected training day.

### 3. **Progress Tracking**
Your current training day is saved. When you come back, you'll see the same day.

### 4. **Marking as Done**
When you complete all exercises, use the **→** button to advance to the next training day (e.g., Day 1 → Day 2).

---

## 📝 Example Training Program

### Day 1 - Lower Body Strength
```
1 | Goblet Squat        | weights    | 5 | 12 | 16
1 | Step-Ups            | weights    | 4 | 10 | 24
1 | Bulgarian Split     | weights    | 3 | 10 | 20
1 | Glute Bridge        | weights    | 4 | 15 | 20
```

### Day 2 - Cardio & Core
```
2 | Row-Bike-SkiErg     | cardio     | | | | 36 | 6.0
2 | Calf Raises         | weights    | 3 | 20 | 10
2 | Dead Bug            | bodyweight | 3 | 12 |
2 | Side Plank          | bodyweight | 3 | 30s |
```

### Day 3 - Upper Body
```
3 | DB Shoulder Press   | weights    | 4 | 10 | 32
3 | Chest-Supported Row | weights    | 4 | 12 | 40
3 | Romanian Deadlift   | weights    | 4 | 10 | 40
```

---

## 🔄 Converting Your Existing Data

If you have data with Day 1, Day 2, Day 3:

Your data is already in the correct format! Just use:
```
Day | Exercise
1   | Goblet Squat
2   | Running
3   | Deadlift
```

Simple numbers work perfectly!

---

## 💡 Tips

1. **Start with Day 1**
   - Always begin your program at Day 1
   - The app defaults to 1

2. **Complete in Order**
   - Do Day 1, then 2, then 3, etc.
   - Use the → button to advance

3. **Repeat if Needed**
   - Use the dropdown to go back to any day
   - Perfect for repeating weeks

4. **Skip Days**
   - Missed Day 03? Just do it next time
   - No need to follow a calendar

5. **Plan Ahead**
   - You can create up to 99 training days
   - Perfect for long-term programs

---

## 🚀 Getting Started

1. **Open your [workout sheet](https://docs.google.com/spreadsheets/d/18DQfProaS9RuCpCMOt3g1ziAZJQFoF9nu0fcaSVJbhE/)**
2. **Create/rename tab to:** `Plan`
3. **Add day numbers** in Column A (01, 02, 03...)
4. **Fill in your exercises**
5. **Refresh the app** at http://localhost:8081
6. **Select Training Day 01**
7. **Start training!** 🎯

---

## Example Sheet Data

Copy this format exactly:

```
Day | Exercise                  | Type       | Sets | Reps | Kg | Personal Best | Duration | Distance | Notes                        | Media URL
1   | Goblet Squat (tempo 3-1-1)| weights    | 5    | 12   | 16 |               |          |          | Slow 3s down • 1s pause • 1s up | https://sportscienceinsider.com/...
1   | Step-Ups (weighted)       | weights    | 4    | 10   | 24 |               |          |          | Full foot on box             | https://liftmanual.com/...
2   | Row-Bike-SkiErg          | cardio     |      |      |    | 6:00          | 36       | 6.0      | Easy nasal breathing         | https://...
```

That's it! Your training program is now flexible and progress-based! 🎉

