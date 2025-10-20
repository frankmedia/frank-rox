# 🏆 Personal Best Tracking System

## How It Works

### 1. **Where PBs are Stored**
- **Plan tab, Column G** - Current PB for each exercise
- **History tab, Column G** - "🏆 YES" flag when you beat a PB
- **Each user's data is in THEIR OWN sheet** (not the master sheet!)

### 2. **Automatic PB Detection**
When you "Mark as Done" on an exercise:
```
1. You lift 18kg on Goblet Squat
2. Apps Script checks Plan tab Column G (current PB: 16kg)
3. 18 > 16 → NEW PB! 🏆
4. Updates Plan tab: 16kg → 18kg
5. Writes to History tab with "🏆 YES"
6. Returns PB data to app
7. App shows celebration toast
```

### 3. **What Gets Tracked**

#### For Weights Exercises:
- **Weight (kg)** - compared for PB
- Sets completed
- Reps completed
- RPE (1-10)
- Notes

#### For Cardio Exercises:
- Duration (min)
- Distance (km)
- RPE
- Notes
- *(PB tracking for cardio can be added later)*

#### For Bodyweight Exercises:
- Sets completed
- Reps completed
- RPE
- Notes
- *(No PB for bodyweight currently)*

### 4. **History Tab Structure**

| Exercise | Date | Weight (kg) | Sets | Reps | RPE | Is PB | Duration | Distance | Notes |
|----------|------|-------------|------|------|-----|-------|----------|----------|-------|
| Goblet Squat | 20/10/2025 14:30 | 18 | 5 | 12 | 7 | 🏆 YES | | | New PR! |
| Step-Ups | 20/10/2025 14:35 | 24 | 4 | 10 | 8 | | | | Tough! |

**PB rows are highlighted in light yellow** (#FFF9E6)

---

## Setup Steps

### ✅ Step 1: Set Up Apps Script
Follow the instructions in `APPS_SCRIPT_SETUP.md`:
1. Open your master sheet
2. Extensions → Apps Script
3. Copy the provided code
4. Deploy as Web App
5. Copy the deployment URL

### ✅ Step 2: Add URL to .env
```bash
VITE_APPS_SCRIPT_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

### ✅ Step 3: Restart Dev Server
```bash
npm run dev
```

### ✅ Step 4: Test It!
1. Go to an exercise
2. Enter a weight HIGHER than your current PB
3. Mark as Done
4. See the 🏆 celebration!
5. Check your Plan tab - PB updated!
6. Check your History tab - new row with "🏆 YES"

---

## How Data Flows

```
┌─────────────────────────────────────────────────────────────────┐
│                        MASTER SHEET                             │
│  (19ywi1KUMttnYOtic649TG1ZObtnTXprKe6qe5UBJat8)               │
│                                                                  │
│  logins tab:                                                     │
│  ┌──────────┬──────────┬─────────────────────────┐            │
│  │ User     │ Password │ Sheet URL               │            │
│  ├──────────┼──────────┼─────────────────────────┤            │
│  │ frank    │ frank123 │ https://docs.google...  │            │
│  │ barbara  │ bar123   │ https://docs.google...  │            │
│  └──────────┴──────────┴─────────────────────────┘            │
│                                                                  │
│  Apps Script attached here! ⚙️                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Looks up user's sheet URL
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FRANK'S WORKOUT SHEET                       │
│  (18DQfProaS9RuCpCMOt3g1ziAZJQFoF9nu0fcaSVJbhE)               │
│                                                                  │
│  Plan tab:                                                       │
│  ┌──────┬────────────┬───────┬──────┬──────┬────┬──────┐      │
│  │ Day  │ Exercise   │ Type  │ Sets │ Reps │ Kg │ PB   │      │
│  ├──────┼────────────┼───────┼──────┼──────┼────┼──────┤      │
│  │ 1    │ Goblet     │weights│ 5    │ 12   │ 16 │ 18kg │ ← PB!│
│  └──────┴────────────┴───────┴──────┴──────┴────┴──────┘      │
│                                                                  │
│  History tab:                                                    │
│  ┌────────────┬──────────────┬────┬──────┬──────┬────┬──────┐ │
│  │ Exercise   │ Date         │ Kg │ Sets │ Reps │RPE │ PB   │ │
│  ├────────────┼──────────────┼────┼──────┼──────┼────┼──────┤ │
│  │ Goblet     │ 20/10 14:30  │ 18 │ 5    │ 12   │ 7  │🏆 YES│ │
│  └────────────┴──────────────┴────┴──────┴──────┴────┴──────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ▲
                              │ Writes here
                              │
┌─────────────────────────────────────────────────────────────────┐
│                        FRANK ROCK APP                            │
│                                                                  │
│  1. User enters: 18kg                                            │
│  2. Clicks "Mark as Done"                                        │
│  3. Sends to Apps Script:                                        │
│     { username: "frank", exercise: "Goblet", weight: 18,         │
│       sets: 5, reps: 12, rpe: 7 }                               │
│  4. Receives: { success: true, isPB: true, message: "🏆..." }   │
│  5. Shows: "🏆 NEW PERSONAL BEST!"                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Privacy & Security

✅ **Each user's data stays in their own sheet**
- Frank's logs → Frank's History tab
- Barbara's logs → Barbara's History tab
- Master sheet only stores directory

✅ **Apps Script runs under YOUR account**
- Only you can read/write to sheets
- Users can't access others' data
- No sensitive credentials exposed

✅ **Rate limits**
- Google Apps Script: ~20 writes/minute
- More than enough for workouts

---

## Future Enhancements (Optional)

### 🔮 Coming Soon:
- [ ] PB tracking for cardio (fastest pace)
- [ ] PB tracking for bodyweight (max reps)
- [ ] PB history chart (see progress over time)
- [ ] PB leaderboard (compare with training partners)
- [ ] Email notification on new PB
- [ ] Instagram/social share for PBs

---

## Troubleshooting

### "Apps Script URL not configured"
- Check `.env` file has `VITE_APPS_SCRIPT_URL`
- Make sure the URL starts with `https://script.google.com/macros/s/`
- Restart dev server after updating `.env`

### "User not found in master sheet"
- Check master sheet `logins` tab
- Verify username matches exactly (case-sensitive)
- Make sure Sheet URL column is filled

### "Failed to log exercise"
- Check Apps Script deployment is "Anyone" can access
- Check Execution log in Apps Script (View → Executions)
- Verify user's workout sheet has correct permissions

### PB not detecting
- Check Plan tab Column G has a number (e.g., "16" or "16kg")
- Apps Script extracts numbers, so "16 kg" or "16kg" both work
- Make sure exercise names match exactly between Plan and History

---

## Questions?

1. **Can I manually edit PBs?** Yes! Edit Plan tab Column G directly
2. **Can I delete History entries?** Yes, but PB won't recalculate automatically
3. **What if I lift less than my PB?** It still logs, just no PB flag
4. **Can multiple users use the same master sheet?** YES! That's the whole point 🎉

---

**Ready to crush some PRs! 🏋️‍♂️💪**

