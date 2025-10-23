# Health Integration & PWA Setup Guide

## ✅ What's Been Implemented

### 1. Health Data Integration
- **iOS HealthKit** and **Android Health Connect** support
- Real-time heart rate zone tracking during workouts
- Auto-populate assessment with sleep and heart rate data
- Save workouts back to health apps

### 2. PWA (Progressive Web App) Support
- Install as app from browser (Chrome, Safari, Edge)
- Offline capability
- App-like experience
- Home screen icon
- Splash screen

---

## 📱 Health Features

### Heart Rate Zone Tracking
- **5 Training Zones** calculated based on age and max HR
  - Zone 1: Recovery (50-60% max HR) - Green
  - Zone 2: Aerobic (60-70% max HR) - Blue
  - Zone 3: Tempo (70-80% max HR) - Yellow
  - Zone 4: Threshold (80-90% max HR) - Orange
  - Zone 5: Max Effort (90-100% max HR) - Red

- **Real-time Display**: Shows current HR and zone during cardio/running/HIIT exercises
- **Inline Display**: Compact HR badge on exercise cards

### Assessment Auto-Population
- **Sleep Hours**: Automatically imports average sleep from last 7 days
- **Sleep Quality**: Estimated from sleep duration
- **Resting Heart Rate**: Used to estimate endurance level
- **Steps**: Today's step count

### Workout Logging
- Completed workouts automatically saved to HealthKit/Health Connect
- Includes: duration, calories, workout type

---

## 🔧 Setup Instructions

### iOS Setup (HealthKit)

1. **Open Xcode**:
   ```bash
   npx cap open ios
   ```

2. **Enable HealthKit Capability**:
   - Select your app target in Xcode
   - Go to "Signing & Capabilities" tab
   - Click "+" button
   - Add "HealthKit" capability

3. **Permissions Already Configured** ✅:
   - `Info.plist` already contains:
     - `NSHealthShareUsageDescription`
     - `NSHealthUpdateUsageDescription`
     - `NSMotionUsageDescription`

4. **Build and Run**:
   - Build the app in Xcode
   - On first health data request, iOS will show permission prompt

### Android Setup (Health Connect)

1. **Minimum SDK Version**:
   - Check `android/app/build.gradle`:
   ```gradle
   android {
       defaultConfig {
           minSdkVersion 26  // Must be 26 or higher
       }
   }
   ```

2. **Permissions Already Configured** ✅:
   - `AndroidManifest.xml` already contains:
     - `ACTIVITY_RECOGNITION`
     - `health.READ_STEPS`
     - `health.READ_HEART_RATE`
     - `health.READ_SLEEP`
     - `health.READ_ACTIVE_CALORIES_BURNED`
     - `health.WRITE_EXERCISE`

3. **Health Connect App**:
   - Android 14+: Pre-installed
   - Android 13 and below: User must install from Play Store
   - App will guide users to install if needed

4. **Build and Run**:
   ```bash
   npx cap sync android
   npx cap open android
   ```
   - Build in Android Studio
   - On first health data request, Android will show permission prompt

---

## 🌐 PWA Installation

### For Users

#### Chrome/Edge (Desktop & Android):
1. Visit `https://my.roxpt.app`
2. Look for install icon in address bar
3. Click "Install" or use menu → "Install RoxPT"

#### Safari (iOS/Mac):
1. Visit `https://my.roxpt.app`
2. Tap Share button
3. Tap "Add to Home Screen"
4. Tap "Add"

#### In-App Prompt:
- App shows install prompt automatically
- Click "Install" button
- Dismiss if not interested (won't show again)

### PWA Features
- ✅ Works offline
- ✅ Fast loading
- ✅ Full-screen mode
- ✅ Home screen icon
- ✅ Push notifications (future)
- ✅ Background sync (future)

---

## 🧪 Testing Health Integration

### iOS Testing:
1. Use real device with Apple Watch (simulator limited)
2. Open app → Go to Assessment
3. Click "Import Health" button in header
4. Grant permissions when prompted
5. Check that sleep/HR fields auto-populate

### Android Testing:
1. Use real device with Health Connect installed
2. Open app → Go to Assessment
3. Click "Import Health" button in header
4. Grant permissions when prompted
5. Check that sleep/HR fields auto-populate

### Heart Rate Zone Testing:
1. Start a cardio/running/HIIT workout
2. Wear Apple Watch or compatible device
3. Look for heart rate badge on exercise card
4. Should show: ❤️ 145 Z4 (example)
5. Color changes based on zone

---

## 📦 Files Created

### Health Integration:
- `src/types/health.ts` - TypeScript types for health data
- `src/services/healthKit.ts` - Health data service (read/write)
- `src/components/HeartRateZone.tsx` - HR zone display components

### PWA Support:
- `public/manifest.json` - PWA manifest
- `src/utils/pwaInstall.ts` - PWA install utilities
- `src/components/PWAInstallPrompt.tsx` - Install prompt UI

### Configuration:
- `ios/App/App/Info.plist` - iOS permissions
- `android/app/src/main/AndroidManifest.xml` - Android permissions
- `index.html` - PWA meta tags

---

## 🚀 Deployment

### Build for Production:
```bash
# Build web app
npm run build

# Sync with native projects
npx cap sync

# iOS
npx cap open ios
# Build in Xcode → Archive → Distribute

# Android
npx cap open android
# Build in Android Studio → Build → Generate Signed Bundle
```

### Deploy Web (Vercel):
```bash
# Already configured for my.roxpt.app
git push origin main
# Vercel auto-deploys
```

---

## 🐛 Troubleshooting

### "Health APIs not available"
- **iOS**: HealthKit not available on simulator (use real device)
- **Android**: Health Connect not installed (guide user to Play Store)

### Heart rate not showing
- Ensure Apple Watch or compatible device is connected
- Check Bluetooth connection
- Verify health permissions granted
- Try starting a workout on watch

### PWA not showing install prompt
- Must be served over HTTPS
- User may have dismissed it before
- Check browser compatibility
- Clear site data and try again

### Permissions not requesting
- Check `Info.plist` / `AndroidManifest.xml` syntax
- Rebuild native projects: `npx cap sync`
- Clean build folders
- Check console for errors

---

## 📊 Health Data Privacy

- **User Control**: Users grant/revoke permissions anytime
- **Local First**: Data stays on device unless explicitly synced
- **Transparent**: Clear permission descriptions
- **Secure**: Uses platform APIs (HealthKit/Health Connect)
- **No Tracking**: We don't collect health data on servers

---

## 🎯 Next Steps

### Phase 2 (Future):
- [ ] VO2 Max integration
- [ ] HRV (Heart Rate Variability) tracking
- [ ] Nutrition logging
- [ ] Weight tracking
- [ ] Push notifications for workouts
- [ ] Background sync

### Phase 3 (Future):
- [ ] Wearable integration (Garmin, Fitbit, Whoop)
- [ ] Advanced analytics dashboard
- [ ] Training load calculations
- [ ] Recovery score
- [ ] Race day predictions

---

## 📚 Resources

- [Capacitor Health Plugin](https://github.com/Ad-Scientiam/capacitor-health)
- [Apple HealthKit](https://developer.apple.com/health-fitness/)
- [Android Health Connect](https://developer.android.com/health-and-fitness/guides/health-connect)
- [PWA Documentation](https://web.dev/progressive-web-apps/)

---

**Questions?** Contact the dev team or check the inline code comments! 🚀

