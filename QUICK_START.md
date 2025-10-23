# 🚀 RoxPT Quick Start Guide

## For Users

### Install as App (PWA)
**Chrome/Edge (Desktop & Android):**
1. Visit `https://my.roxpt.app`
2. Click install icon in address bar OR
3. Menu → "Install RoxPT"

**Safari (iOS/Mac):**
1. Visit `https://my.roxpt.app`
2. Tap Share button (box with arrow)
3. Tap "Add to Home Screen"
4. Tap "Add"

### Connect Health Data
1. Open app → Go to Assessment
2. Click "Import Health" button (top right)
3. Grant permissions when prompted
4. Sleep & heart rate auto-filled! ✨

### Track Heart Rate During Workouts
1. Wear Apple Watch or compatible device
2. Start cardio/running/HIIT workout
3. See live HR and zone: ❤️ 145 Z4
4. Stay in your target zone!

---

## For Developers

### Run Locally
```bash
cd /Users/frank/frank-rox/frank-rox
npm install
npm run dev
```

### Build for Production
```bash
npm run build
npx cap sync
```

### iOS Development
```bash
npx cap open ios
# In Xcode:
# 1. Add HealthKit capability
# 2. Build & Run
```

### Android Development
```bash
npx cap open android
# In Android Studio:
# 1. Build → Run
# 2. Test on real device
```

### Deploy Web
```bash
git push origin main
# Vercel auto-deploys to my.roxpt.app
```

---

## Key Features

✅ **Health Integration**
- iOS HealthKit & Android Health Connect
- Auto-import sleep & heart rate
- Real-time HR zone tracking
- Save workouts to health apps

✅ **PWA Support**
- Install from browser
- Works offline
- Full-screen mode
- Home screen icon

✅ **HYROX Algorithm**
- Personalized time predictions
- 6 fitness indices
- Training prescriptions
- Strengths & focus areas

---

## Documentation

📚 **Full Guides:**
- `HEALTH_INTEGRATION_SETUP.md` - Health setup
- `PWA_ICON_GUIDE.md` - Icon creation
- `IMPLEMENTATION_SUMMARY.md` - Complete overview
- `DOMAIN_MIGRATION.md` - Domain setup

🐛 **Troubleshooting:**
- Health not working? Use real device (not simulator)
- PWA not installing? Check HTTPS and browser compatibility
- Icons missing? See `PWA_ICON_GUIDE.md`

---

## Support

💬 **Questions?** Check the documentation or contact the dev team!

🚀 **Ready to train?** Visit `https://my.roxpt.app`

