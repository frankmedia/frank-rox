# Frank Rock - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root (copy from `.env.example`):

```env
# Google Sheets API Configuration
VITE_GOOGLE_SHEETS_API_KEY=your_api_key_here

# Master Sheet ID
VITE_MASTER_SHEET_ID=19ywi1KUMttnYOtic649TG1ZObtnTXprKe6qe5UBJat8

# Current User
VITE_USER_NAME=frank
```

### 3. Run Development Server
```bash
npm run dev
```

The app will be available at **http://localhost:8081**

## 🔑 Authentication

### Current Setup (Hardcoded)
For now, authentication uses simple username/password stored in the app:

**Demo Credentials:**
- Username: `frank`
- Password: `frank123`

These are defined in `/src/contexts/AuthContext.tsx` (line 38-47).

### Google Sheets Integration (Recommended)
You can integrate user authentication with your [master Google Sheet](https://docs.google.com/spreadsheets/d/19ywi1KUMttnYOtic649TG1ZObtnTXprKe6qe5UBJat8/edit?gid=0#gid=0) by adding a new tab called "Users":

**Users Tab Format:**
| Username | Password | Email | Name | Allowed |
|----------|----------|-------|------|---------|
| frank | frank123 | frank@example.com | Frank | TRUE |

To enable this, update the `login` function in `/src/contexts/AuthContext.tsx` to fetch from the Users sheet.

## 📊 Google Sheets Setup

### Master Sheet Structure
URL: https://docs.google.com/spreadsheets/d/19ywi1KUMttnYOtic649TG1ZObtnTXprKe6qe5UBJat8/edit

**Sheet1 Format:**
| User | Sheet URL |
|------|-----------|
| frank | https://docs.google.com/spreadsheets/d/18DQfProaS9RuCpCMOt3g1ziAZJQFoF9nu0fcaSVJbhE/edit?usp=sharing |

### Individual User Workout Sheet Structure

Each user's workout sheet should have the following tabs:

#### 1. **Plan Tab**
Training plan with weekday-based exercises:

| Weekday | Exercise Name | Type | Sets | Reps | Suggested Weight | Personal Best | Duration | Distance |
|---------|---------------|------|------|------|-----------------|---------------|----------|----------|
| Monday | Barbell Squat | strength | 4 | 8 | 100 | 120kg | | |
| Monday | Bench Press | strength | 4 | 10 | 80 | 95kg | | |
| Tuesday | Running | cardio | | | | 04:32 | 20 | 5.0 |
| Wednesday | Deadlift | strength | 3 | 6 | 140 | 160kg | | |

**Column Details:**
- **Weekday**: Monday, Tuesday, Wednesday, etc. (case-insensitive)
- **Exercise Name**: Name of the exercise
- **Type**: `strength` or `cardio`
- **Sets/Reps**: For strength exercises
- **Suggested Weight**: Recommended weight in kg
- **Personal Best**: Best performance (e.g., "120kg" or "04:32")
- **Duration**: Minutes (for cardio)
- **Distance**: Kilometers (for cardio)

#### 2. **History Tab** (for logging workouts)
Workout logs:

| Exercise | Date | Weight | RPE | Is PB | Duration | Distance | Notes |
|----------|------|--------|-----|-------|----------|----------|-------|
| Barbell Squat | Sun, 21 Jan 2024 at 12:44 AM | 100 | 7 | TRUE | | | Felt good |
| Running | Mon, 22 Jan 2024 at 6:00 AM | | 8 | FALSE | 20 | 5.2 | Morning run |

**Column Details:**
- **Exercise**: Name of the exercise (must match Plan)
- **Date**: Auto-generated timestamp
- **Weight**: Weight lifted in kg (for strength)
- **RPE**: Rate of Perceived Exertion (1-10)
- **Is PB**: TRUE/FALSE for personal best
- **Duration**: Minutes (for cardio)
- **Distance**: Kilometers (for cardio)
- **Notes**: Optional notes

## 🔐 Google Sheets API Key

### Get Your API Key:
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Sheets API**
4. Create credentials → API Key
5. (Optional) Restrict API key to:
   - Google Sheets API only
   - Your domain/IP addresses

### Set API Key:
Add to your `.env` file:
```env
VITE_GOOGLE_SHEETS_API_KEY=AIzaSyD...your_key_here
```

### Make Sheets Public:
For read-only access with API key:
1. Open your Google Sheet
2. Click "Share" → "Anyone with the link"
3. Set to "Viewer"

## 📱 App Features

### ✅ Implemented
- **Login/Authentication** - Simple username/password
- **Today View** - Shows exercises filtered by current weekday
- **Exercise Detail** - Full-page card with prev/next navigation
  - Strength: Sets×Reps, suggested weight, RPE, notes
  - Cardio: Duration, distance, RPE, notes
  - Rest timer for strength exercises
- **History** - View past workouts and stats
- **Profile** - User info and linked Google Sheet
- **Bottom Navigation** - Mobile-first nav bar (Today • History • Profile)
- **Google Sheets Integration** - Fetch exercises and workout data

### 🔄 Write Operations (Placeholder)
Currently, marking exercises as "done" only logs to console. To enable writing:
1. Implement OAuth2 authentication
2. Or use Google Apps Script as a backend proxy
3. Or use Vercel serverless functions

## 🎨 UI/UX
- **Mobile-first design** - Optimized for phone usage
- **Modern UI** - Built with shadcn/ui components
- **Dark/Light mode ready** - Supports system theme
- **Responsive** - Works on all screen sizes

## 🌐 Deployment to Vercel

The project is ready for Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Build Configuration:
- **Framework**: Vite
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

### Environment Variables on Vercel:
Add these in your Vercel project settings:
- `VITE_GOOGLE_SHEETS_API_KEY`
- `VITE_MASTER_SHEET_ID`
- `VITE_USER_NAME`

## 📝 Development

### Project Structure
```
src/
├── components/        # Reusable UI components
│   ├── ui/           # shadcn/ui components
│   ├── BottomNav.tsx
│   ├── ExerciseCard.tsx
│   └── ...
├── contexts/         # React contexts (Auth)
├── hooks/            # Custom React hooks
├── lib/              # Utility functions
├── pages/            # Page components
│   ├── Login.tsx
│   ├── Today.tsx
│   ├── ExerciseDetail.tsx
│   ├── History.tsx
│   ├── Profile.tsx
│   └── ...
├── services/         # API services (Google Sheets)
├── types/            # TypeScript types
└── App.tsx           # Main app component
```

### Available Scripts
- `npm run dev` - Start development server (port 8081)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🐛 Troubleshooting

### App loads but no exercises show up
- Check that `VITE_GOOGLE_SHEETS_API_KEY` is set
- Verify your Google Sheet is publicly accessible
- Check browser console for API errors
- Verify Plan tab format matches expected structure

### "Failed to fetch" errors
- Check that Google Sheets API is enabled
- Verify API key restrictions allow your domain
- Check CORS settings (should work with public sheets)

### Login doesn't work
- Default credentials are `frank` / `frank123`
- Check `/src/contexts/AuthContext.tsx` for current credentials

## 📚 Next Steps

1. **Enable Write Operations** - Implement OAuth2 or backend proxy
2. **Stopwatch/Countdown** - Add functional timers for cardio
3. **History Detail Modal** - Show trends for individual exercises
4. **Offline Support** - Add service worker and offline caching
5. **PWA Features** - Add manifest and install prompts
6. **Settings Page** - Unit preferences, theme toggle

## 🤝 Support

For issues or questions, check the Google Sheets setup first, then verify your `.env` configuration.

