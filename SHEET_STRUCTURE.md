# 📊 Google Sheets Structure for Frank Rock

## Master Sheet
**URL:** https://docs.google.com/spreadsheets/d/19ywi1KUMttnYOtic649TG1ZObtnTXprKe6qe5UBJat8/

### Tab: Sheet1 (or any default tab)

| A (User) | B (Password) | C (Sheet URL) |
|----------|--------------|---------------|
| frank | frank123 | https://docs.google.com/spreadsheets/d/18DQfProaS9RuCpCMOt3g1ziAZJQFoF9nu0fcaSVJbhE/edit?usp=sharing |

---

## Frank's Workout Sheet
**URL:** https://docs.google.com/spreadsheets/d/18DQfProaS9RuCpCMOt3g1ziAZJQFoF9nu0fcaSVJbhE/

### Tab 1: `Plan` ⭐ (Required)

This tab contains your training plan. The app shows exercises for the CURRENT TRAINING DAY.

#### Column Structure:

| Column | Name | Required | Description | Example |
|--------|------|----------|-------------|---------|
| **A** | Day | ✅ Yes | Training day number | 1, 2, 3, etc. |
| **B** | Exercise | ✅ Yes | Exercise name (prefix "CIRCUIT:", "AMRAP:", "→" for groups) | Goblet Squat |
| **C** | Type | ✅ Yes | `weights`, `cardio`, `bodyweight`, `mobility`, `hiit`, `circuit`, `amrap` | weights |
| **D** | Sets | For weights/bodyweight/hiit/circuit | Number of sets/rounds/intervals | 5 |
| **E** | Reps | For weights/bodyweight | Reps per set | 12 |
| **F** | Kg | For weights only | Suggested weight in kg | 16 |
| **G** | Personal Best | Optional (NOT for mobility/hiit/circuit/amrap) | Your best performance | 20kg |
| **H** | Duration | For cardio/mobility/hiit/amrap | Minutes (time cap for AMRAP) | 36 |
| **I** | Distance | For cardio only | Kilometers | 6.0 |
| **J** | Notes | Optional | Instructions/form cues/work-rest ratio (HIIT) | Slow 3s down • 1s pause • 1s up |
| **K** | Media URL | Optional | Image or YouTube URL | https://... |

---

### 📝 **How to Fill Columns for Each Exercise Type:**

#### 🏋️ **WEIGHTS** (Type = `weights`)
**Example: Goblet Squat**

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Goblet Squat (tempo 3-1-1) | weights | 5 | 12 | 16 | 20kg | | | Slow 3s down • 1s pause | https://... |

**Fill:** Day, Exercise, Type=`weights`, Sets, Reps, Kg, Personal Best (optional), Notes (optional), Media URL (optional)
**Leave Empty:** Duration, Distance

---

#### 🏃 **CARDIO** (Type = `cardio`)
**Example: Rowing Machine - Nannan Drills**

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Nannan - 10 min / 1.8 km | cardio | | | | | 10 | 1.8 | Fast strokes, maintain pace | https://... |
| 1 | Nannan - 8 min / 1.5 km | cardio | | | | | 8 | 1.5 | Sprint pace | |
| 1 | Nannan - 10 min / 4 km | cardio | | | | | 10 | 4 | Long distance | |

**Fill:** Day, Exercise, Type=`cardio`, Duration (H), Distance (I), Notes (optional), Media URL (optional)
**Leave Empty:** Sets, Reps, Kg, Personal Best

**Note:** Each Nannan drill should be a **separate row** with its own duration and distance target!

---

#### 💪 **BODYWEIGHT** (Type = `bodyweight`)
**Example: Dead Bug**

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Dead Bug | bodyweight | 3 | 12 | | | | | Lower back flat, breathe | https://... |

**Fill:** Day, Exercise, Type=`bodyweight`, Sets, Reps, Notes (optional), Media URL (optional)
**Leave Empty:** Kg, Personal Best, Duration, Distance

---

#### 🧘 **MOBILITY** (Type = `mobility`)
**Example: Hip Mobility Flow**

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Hip Mobility Flow | mobility | | | | | 10 | | Slow controlled movements | https://... |

**Fill:** Day, Exercise, Type=`mobility`, Duration (H), Notes (optional), Media URL (optional)
**Leave Empty:** Sets, Reps, Kg, **Personal Best** (NO PB for mobility!), Distance

---

#### 📋 **INTRO** (Type = `intro`) - OPTIONAL
**Example: Daily Workout Overview**

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Conditioning | intro | | | | | | | Today we are going to work on your fitness level to make sure you can compete at the Hyrox. | |

**Fill:** Day, Exercise (title), Type=`intro`, Notes (J) = description/explanation
**Leave Empty:** Sets, Reps, Kg, Personal Best, Duration, Distance, Media URL

**How it works:**
- The intro card appears at the **TOP of the Today page** with a **yellow border**
- Provides context for what the day's workout is about
- **Optional** - only shows if you add an intro row for that day
- Changes automatically when you switch training days
- **Not clickable** - purely informational

**When to use:**
- Explain the day's focus (e.g., "Lower Body Strength", "HYROX Simulation")
- Set expectations (e.g., "Today's workout is high intensity")
- Provide motivational context

---

#### ⚡ **HIIT** (Type = `hiit`)
**Example: Assault Bike HIIT**

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| 3 | Assault Bike HIIT | hiit | 8 | | | | 4 | | 20s work / 10s rest | https://... |

**Fill:** Day, Exercise, Type=`hiit`, Sets (D) = number of intervals, Duration (H) = total time (optional), Notes (J) = work/rest ratio (e.g., "20s work / 10s rest")
**Leave Empty:** Reps, Kg, Personal Best, Distance
**Leave Media URL optional**

**How it works:**
- Sets = number of intervals (e.g., 8 intervals)
- Notes = work/rest split (e.g., "20s work / 10s rest" or "20s/10s")
- App provides auto-interval timer with beeps

---

#### 🔄 **CIRCUIT** (Type = `circuit`)
**Example: Circuit with multiple exercises**

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| 3 | CIRCUIT: Lower Body | circuit | 3 | | | | | | 90s rest between rounds | |
| 3 | → Dumbbell Front Squat | circuit_exercise | | 10 | 6 | | | | | |
| 3 | → Step-Ups | circuit_exercise | | 10 | 6 | | | | | |
| 3 | → Seated Row | circuit_exercise | | 12 | 18 | | | | | |

**Fill:** 
- **Header row:** Exercise Name starts with "CIRCUIT:", Type=`circuit`, Sets (D) = number of rounds, Notes = rest info
- **Exercise rows:** Exercise Name starts with "→", Type=`circuit_exercise`, Reps, Kg (if weights)
**Leave Empty:** Personal Best, Duration, Distance (on header), Media URL (on header)

**How it works:**
- First row = Circuit header with total rounds
- Following rows = individual exercises in the circuit
- App shows round-tracking circles (tap to mark each round complete)
- Orange border color (`#FF6600`)

---

#### 🎯 **AMRAP** (As Many Reps/Rounds As Possible) (Type = `amrap`)
**Example: 10-minute AMRAP**

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| 3 | AMRAP: Bodyweight | amrap | | | | | 10 | | | |
| 3 | → Burpees | amrap_exercise | | 10 | | | | | | |
| 3 | → Air Squats | amrap_exercise | | 20 | | | | | | |
| 3 | → Sit-Ups | amrap_exercise | | 30 | | | | | | |

**Fill:** 
- **Header row:** Exercise Name starts with "AMRAP:", Type=`amrap`, Duration (H) = time cap in minutes
- **Exercise rows:** Exercise Name starts with "→", Type=`amrap_exercise`, Reps
**Leave Empty:** Sets, Kg, Personal Best, Distance (on header), Media URL (on header)

**How it works:**
- First row = AMRAP header with time cap
- Following rows = exercises to repeat in sequence
- App provides countdown timer and round tracking
- Green border color (`#00FF4D`)

---

#### Example Full Sheet:

```
Row 1: Day | Exercise | Type | Sets | Reps | Kg | Personal Best | Duration | Distance | Notes | Media URL
Row 2: 1 | Goblet Squat (tempo 3-1-1) | weights | 5 | 12 | 16 | 20kg | | | Slow 3s down • 1s pause • 1s up | https://...
Row 3: 1 | Dead Bug | bodyweight | 3 | 12 | | | | | Lower back flat | https://...
Row 4: 1 | Hip Mobility Flow | mobility | | | | | 10 | | Slow controlled movements | https://...
Row 5: 1 | Nannan - 10 min / 1.8 km | cardio | | | | | 10 | 1.8 | Fast strokes | https://...
Row 6: 1 | Nannan - 8 min / 1.5 km | cardio | | | | | 8 | 1.5 | Sprint pace | 
Row 7: 2 | Bulgarian Split Squat | weights | 3 | 10 | 18 | 22kg | | | Knee tracks over toes | https://...
```

#### Important Notes:
- **Row 1 = Headers** (will be skipped by the app)
- **Day = Training day number:** 1, 2, 3, 4, 5, 6, etc. (your program cycles)
- **Type must be:** `weights`, `cardio`, `bodyweight`, `mobility`, `hiit`, `circuit`, `circuit_exercise`, `amrap`, or `amrap_exercise` (lowercase!)
- **For Nannan-style drills:** Create **one row per interval/drill** with its specific duration and distance
- **Mobility exercises:** NO Personal Best column (PB not tracked for mobility)
- **HIIT/Circuit/AMRAP:** Use header rows + child exercise rows for grouped workouts
- **Media URL supports:**
  - Direct image URLs (jpg, png, gif)
  - YouTube URLs (youtube.com/watch?v=, youtu.be/, youtube.com/shorts/)
  - Can also put URLs in the **Notes** column - app will detect and display them!

#### Color Scheme:
- **HIIT:** Hot Pink border (`#FF00B2`) ⚡
- **Circuit:** Orange border (`#FF6600`) 🔄
- **AMRAP:** Bright Green border (`#00FF4D`) 🎯
- **Regular exercises:** Yellow accents (`#FFCC00`) 🟡

---

### Tab 2: `History` 🏆 (Auto-created by Apps Script)

This tab stores all your completed workouts. **Created automatically** when you log your first exercise!

| Column | Name | Description | Example |
|--------|------|-------------|---------|
| **A** | Exercise | Exercise name | Goblet Squat (tempo 3-1-1) |
| **B** | Date | Timestamp (DD/MM/YYYY HH:MM) | 20/10/2025 14:30 |
| **C** | Weight (kg) | Weight lifted | 18 |
| **D** | Sets | Sets completed | 5 |
| **E** | Reps | Reps completed | 12 |
| **F** | RPE | Rate of Perceived Exertion (1-10) | 7 |
| **G** | Is PB | 🏆 YES if you beat your PB | 🏆 YES |
| **H** | Duration (min) | Minutes (for cardio) | 36 |
| **I** | Distance (km) | Kilometers (for cardio) | 6.0 |
| **J** | Notes | Workout notes | Felt strong today! |

#### How It Works:
1. **First time:** Apps Script creates the History tab automatically
2. **Every workout:** New row is appended with all your data
3. **Personal Best:** Compares weight to Plan tab Column G
4. **If you beat it:** Updates Plan tab PB + marks History row as 🏆 YES
5. **PB rows:** Highlighted in light yellow (#FFF9E6)

#### Example History Rows:

```
Exercise                    | Date          | Weight | Sets | Reps | RPE | Is PB   | Duration | Distance | Notes
Goblet Squat (tempo 3-1-1) | 20/10/2025 14:30 | 18  | 5    | 12   | 7   | 🏆 YES  |          |          | New PR!
Step-Ups (weighted)        | 20/10/2025 14:35 | 24  | 4    | 10   | 8   |         |          |          | Left leg harder
Bulgarian Split Squat      | 20/10/2025 14:42 | 20  | 3    | 10   | 9   |         |          |          | Tough set
```

**Note:** You never need to manually create or edit the History tab - the Apps Script handles everything!

---

## 🎯 Quick Setup Checklist

- [ ] Create a tab named exactly **`Plan`** in your workout sheet
- [ ] Add column headers in Row 1
- [ ] Fill in your exercises starting from Row 2
- [ ] Make sure **Weekday** column matches: Monday, Tuesday, etc.
- [ ] Set **Type** to either `strength` or `cardio`
- [ ] Add **Notes** with form cues and instructions
- [ ] Add **Media URL** with exercise images or YouTube videos
- [ ] Make your sheet **publicly readable** (Share → Anyone with link → Viewer)
- [ ] Get a Google Sheets API key
- [ ] Add API key to `.env` file

---

## 🎥🖼️ Media Fallback Tabs (Optional)

You can create **Videos** and **Images** tabs for automatic media lookup!

### Tab: `videos` (Optional) 🎥
If an exercise in the Plan tab has no Media URL, the app will automatically check this tab.

**Tab name must be:** `videos` (lowercase)

**Structure:**
| A (Exercise) | B (Video URL) |
|--------------|---------------|
| Goblet Squat | https://youtube.com/watch?v=abc123 |
| Side Plank | https://youtube.com/watch?v=xyz789 |

### Tab: `images` (Optional) 🖼️
If an exercise has no Media URL and no video, the app will check this tab.

**Tab name must be:** `images` (lowercase)

**Structure:**
| A (Exercise) | B (Image URL) |
|--------------|---------------|
| Dead Bug | https://example.com/deadbug.png |
| Glute Bridge | https://images.ctfassets.net/.../bridge.png |

**How it works:**
1. App checks Plan tab for Media URL
2. If empty → checks `videos` tab for matching exercise name
3. If still empty → checks `images` tab for matching exercise name  
4. If found → displays the media automatically!

---

## 📸 Media URL Tips

### Images:
```
https://example.com/image.jpg
https://example.com/image.png
```
- Use direct image URLs
- Images are automatically cropped to 16:9 aspect ratio
- Thumbnails shown on exercise cards (128px height)
- Full-size shown on exercise detail page

### YouTube Videos:
```
https://www.youtube.com/watch?v=VIDEO_ID
https://youtu.be/VIDEO_ID
https://www.youtube.com/shorts/VIDEO_ID
```
- YouTube videos are automatically detected
- Embedded as playable video on detail page
- Thumbnail shown on exercise cards
- Aspect ratio: 16:9

---

## 🚀 How The App Works

1. **Login:** Use `frank` / `frank123` (hardcoded for now)
2. **Today View:** Shows all exercises where Weekday = Today's day
3. **Tap Exercise:** Opens detail page with:
   - Media (image/video) at top
   - Target sets/reps or duration/distance
   - Rest timer (for strength)
   - Input fields for logging
   - Instructions/notes at bottom
4. **Navigate:** Use prev/next arrows to move between today's exercises
5. **Mark Done:** Logs workout (currently to console)

---

## Example Data from Your Sheet

Based on your [frank_training sheet](https://docs.google.com/spreadsheets/d/18DQfProaS9RuCpCMOt3g1ziAZJQFoF9nu0fcaSVJbhE/edit?gid=1006168437#gid=1006168437), here's what your data should look like:

**Day 1 (e.g., Monday):**
- Goblet Squat: 5×12 @ 16kg
- Step-Ups: 4×10 @ 24kg  
- Bulgarian Split Squat: 3×10 @ 20kg
- Glute Bridge: 4×15 @ 20kg
- etc.

Just add a column in front with "Monday" for all Day 1 exercises, "Tuesday" for Day 2, etc.

---

## Need Help?

1. Check that your sheet is publicly readable
2. Verify the API key is set in `.env`
3. Open browser console (F12) to see any errors
4. Check that column order matches exactly
5. Verify weekday spelling (Monday, not monday)

