# 🏋️ Frank Rox Workout Tracker

A mobile-first workout tracking app powered by Google Sheets, designed for HYROX and functional fitness training.

## 🚀 Features

- **📱 Mobile-First Design** - Optimized for phone use in the gym
- **📊 Google Sheets Backend** - All data stored in your own Google Sheets
- **🎯 Multiple Workout Types:**
  - Weights (sets × reps with weight tracking)
  - Cardio (duration & distance tracking)
  - Bodyweight exercises
  - Mobility/Warmup/Cooldown/Stretch
  - HIIT workouts with interval timer
  - Circuit training with round tracking
  - AMRAP (As Many Rounds As Possible) with time cap
- **⏱️ Built-in Timers:**
  - Rest timer for strength exercises
  - Countdown timer for duration-based exercises
  - Interval timer for HIIT workouts
- **📈 Personal Best Tracking** - Automatically updates when you beat your records
- **📝 Workout History** - Track all your completed workouts
- **🔄 Rotating Training Programs** - Support for multi-day cycles (e.g., 14-day program)
- **📋 Daily Intro Cards** - Optional workout descriptions for each training day
- **🎨 Color-Coded Workouts:**
  - Yellow: Standard exercises (weights, cardio, bodyweight, mobility)
  - Hot Pink (#FF00B2): HIIT workouts
  - Orange (#FF6600): Circuit training
  - Bright Green (#00FF4D): AMRAP workouts

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Google Sheets API
- **Deployment:** Vercel

## 📋 Setup

### 1. Google Sheets Setup

Create two Google Sheets:

#### **Master Sheet** (User Directory)
Contains user credentials and links to individual workout sheets.

| Column A (User) | Column B (Password) | Column C (Sheet URL) |
|-----------------|---------------------|----------------------|
| frank | frank123 | https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID |

#### **Individual Workout Sheet**
Each user has their own sheet with these tabs:
- **Plan** - Your training program (required)
- **videos** - Optional media fallback

See [SHEET_STRUCTURE.md](./SHEET_STRUCTURE.md) for detailed column structure.

### 2. Google Sheets API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API**
4. Create credentials (API Key)
5. Restrict API key to Google Sheets API only

### 3. Environment Variables

Create a `.env` file:

```env
VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here
VITE_MASTER_SHEET_ID=your_master_sheet_id_here
```

### 4. Install & Run

```bash
npm install
npm run dev
```

### 5. Deploy to Vercel

```bash
vercel
```

Add environment variables in Vercel dashboard.

## 📱 Usage

1. **Login** with your username/password (from Master Sheet)
2. **Select Training Day** using the day selector
3. **View Intro Card** (if you've added one for that day)
4. **Tap an exercise** to view details and log your workout
5. **Use built-in timers** for rest, countdowns, and intervals
6. **Mark as Done** to log the workout to your history

## 📚 Supported Exercise Types

| Type | Use For | Tracks | Has Timer |
|------|---------|--------|-----------|
| `weights` | Barbell, dumbbells, machines | Sets, reps, kg, PB | Rest timer |
| `cardio` | Running, rowing, biking | Duration, distance, PB | Countdown timer |
| `bodyweight` | Push-ups, pull-ups, planks | Sets, reps, PB | Rest timer |
| `mobility` | Warm-ups, cool-downs, stretching | Duration | Countdown timer |
| `hiit` | High-intensity intervals | Intervals, work/rest ratio | Interval timer |
| `circuit` | Multi-exercise rounds | Rounds, exercises | Round tracking |
| `amrap` | Timed workouts | Time cap, rounds completed | Countdown timer |
| `intro` | Daily workout descriptions | - | - (info only) |

## 🎨 Color Scheme

- **Primary Yellow:** `#FFCC00` - Main brand color
- **HIIT Pink:** `#FF00B2` - High-intensity intervals
- **Circuit Orange:** `#FF6600` - Circuit training
- **AMRAP Green:** `#00FF4D` - AMRAP workouts

## 📖 Documentation

- [SHEET_STRUCTURE.md](./SHEET_STRUCTURE.md) - Complete guide for structuring your Google Sheets
- [PB_TRACKING.md](./PB_TRACKING.md) - How Personal Best tracking works
- [APPS_SCRIPT_SETUP.md](./APPS_SCRIPT_SETUP.md) - Google Apps Script setup (legacy)

## 🤝 Multi-User Support

The app supports multiple users, each with their own:
- Google Sheet
- Workout history (stored in local storage)
- Training day progress
- Personal best records

## 📝 License

Private project for personal use.

## 🏆 Built for HYROX Athletes

Optimized for functional fitness and HYROX competition training, with specialized support for circuits, AMRAPs, and interval training.
