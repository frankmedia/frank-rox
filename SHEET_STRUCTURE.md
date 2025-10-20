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

This tab contains your weekly training plan. The app shows exercises for TODAY's weekday.

#### Column Structure:

| Column | Name | Required | Description | Example |
|--------|------|----------|-------------|---------|
| **A** | Weekday | ✅ Yes | Day of the week | Monday |
| **B** | Exercise | ✅ Yes | Exercise name | Goblet Squat |
| **C** | Type | ✅ Yes | `weights`, `cardio`, or `bodyweight` | weights |
| **D** | Sets | For weights/bodyweight | Number of sets | 5 |
| **E** | Reps | For weights/bodyweight | Reps per set | 12 |
| **F** | Kg | For weights only | Suggested weight in kg | 16 |
| **G** | Personal Best | Optional | Your best performance | 20kg |
| **H** | Duration | For cardio | Minutes | 36 |
| **I** | Distance | For cardio | Kilometers | 6.0 |
| **J** | Notes | Optional | Instructions/form cues | Slow 3s down • 1s pause • 1s up |
| **K** | Media URL | Optional | Image or YouTube URL | https://... |

#### Example Rows:

```
Row 1: Day | Exercise | Type | Sets | Reps | Kg | Personal Best | Duration | Distance | Notes | Media URL
Row 2: Monday | Goblet Squat (tempo 3-1-1) | weights | 5 | 12 | 16 | | | | Slow 3s down • 1s pause • 1s up; chest tall; knees track out | https://sportscienceinsider.com/wp-content/uploads/2022/09/How-to-Goblet-Squat.png
Row 3: Monday | Step-Ups (weighted) | weights | 4 | 10 | 24 | | | | Full foot on box; control the step down; drive through heel | https://liftmanual.com/wp-content/uploads/2023/04/dumbbell-single-leg-step-up.jpg
Row 4: Monday | Dead Bug | bodyweight | 3 | 12 | | | | | Lower back flat; slow controlled limbs; breathe out on reach | https://example.com/deadbug.jpg
Row 5: Tuesday | Row-Bike-SkiErg Rotation (Zone 2) | cardio | | | | 6:00 | 36 | 6.0 | Easy nasal breathing; 70–75% HRmax; smooth strokes | https://www.youtube.com/watch?v=example
```

#### Important Notes:
- **Row 1 = Headers** (will be skipped)
- **Weekday must match exactly:** Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- **Type must be:** `weights`, `cardio`, or `bodyweight` (lowercase)
- **For weights exercises:** Fill Sets, Reps, Kg columns
- **For bodyweight exercises:** Fill Sets, Reps columns (no Kg)
- **For cardio exercises:** Fill Duration, Distance columns
- **Media URL supports:**
  - Direct image URLs (jpg, png, gif)
  - YouTube URLs (youtube.com/watch?v=, youtu.be/, youtube.com/shorts/)
  - Images are cropped to 16:9 aspect ratio
  - YouTube videos are embedded

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

