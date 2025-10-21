# 📱 Mobile App Deployment Guide

Your RoxPT app is now ready for iOS and Android! Here's how to build and deploy.

---

## 🎯 Quick Overview

Your app now uses **Capacitor** to wrap your web app as native iOS and Android apps:

- ✅ **Web assets** are in `dist/` (built with `npm run build`)
- ✅ **iOS project** is in `ios/` (Xcode)
- ✅ **Android project** is in `android/` (Android Studio)
- ✅ **LocalStorage** works natively on all platforms
- ✅ **Offline-first** - reads from Google Sheets, writes locally

---

## 📦 Build Process

### 1. **Build the Web App**
```bash
npm run build
```
This creates the production web app in `dist/`

### 2. **Sync to Native Projects**
```bash
npx cap sync
```
This copies the web assets to iOS and Android projects

---

## 🍎 iOS Deployment

### Prerequisites
- **Mac with macOS** (required for iOS builds)
- **Xcode** (download from Mac App Store)
- **Apple Developer Account** ($99/year for App Store)

### Steps

1. **Open iOS project in Xcode:**
   ```bash
   npx cap open ios
   ```

2. **Configure App Signing:**
   - In Xcode, select your project in the left sidebar
   - Go to "Signing & Capabilities" tab
   - Select your Team (Apple Developer Account)
   - Xcode will automatically handle provisioning

3. **Update Bundle Identifier (optional):**
   - Change `com.roxpt.app` to your own domain
   - Update in `capacitor.config.ts` and Xcode

4. **Build and Test:**
   - Select a simulator or connected iPhone
   - Click the ▶️ Run button
   - Test the app thoroughly

5. **Deploy to TestFlight:**
   - Archive your app (Product → Archive)
   - Upload to App Store Connect
   - Submit for TestFlight review
   - Invite beta testers

6. **App Store Submission:**
   - Prepare app metadata (screenshots, description, etc.)
   - Submit for review
   - Wait for Apple approval (~1-3 days)

---

## 🤖 Android Deployment

### Prerequisites
- **Android Studio** (download from https://developer.android.com/studio)
- **Google Play Console Account** ($25 one-time fee)

### Steps

1. **Open Android project in Android Studio:**
   ```bash
   npx cap open android
   ```

2. **Sync Gradle:**
   - Android Studio will prompt to sync Gradle
   - This will download all dependencies
   - **Note:** You need **Java 11** or higher for Android builds

3. **Update Package Name (optional):**
   - Change `com.roxpt.app` to your own domain
   - Update in `capacitor.config.ts` and `android/app/build.gradle`

4. **Build and Test:**
   - Select an emulator or connected Android device
   - Click the ▶️ Run button
   - Test the app thoroughly

5. **Generate Signed APK/Bundle:**
   - Build → Generate Signed Bundle / APK
   - Create a new keystore (save it securely!)
   - Choose "Android App Bundle" (.aab)
   - Build for release

6. **Deploy to Google Play:**
   - Go to Google Play Console
   - Create a new app
   - Upload your .aab bundle
   - Fill in app details and screenshots
   - Submit for review (usually approved within hours)

---

## 🌐 Web (PWA) Deployment

Your app already works as a Progressive Web App!

### Deploy to Vercel

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add mobile app support"
   git push origin main
   ```

2. **Deploy on Vercel:**
   - Go to https://vercel.com
   - Import your GitHub repo
   - Vercel auto-detects Vite config
   - Deploy!

3. **Users can install as PWA:**
   - On mobile browsers, "Add to Home Screen"
   - Works offline with localStorage

---

## 🔧 Development Workflow

### Daily Development

1. **Edit your code** (React, TypeScript, etc.)
2. **Build for web:**
   ```bash
   npm run dev
   ```
3. **Test in browser** at http://localhost:8081

### When ready to test on mobile

1. **Build production:**
   ```bash
   npm run build
   ```

2. **Sync to native:**
   ```bash
   npx cap sync
   ```

3. **Open native IDE:**
   ```bash
   npx cap open ios    # or
   npx cap open android
   ```

4. **Run on device/simulator**

---

## 📊 Data Storage

Your app uses a **hybrid approach**:

### Google Sheets (READ)
- Workout plans
- Exercise library
- Training schedules
- Updated centrally by you

### LocalStorage (WRITE)
- Workout history
- Personal bests
- Completed exercises
- Synced to Google Sheets when online (via Vercel API)

### Why this works perfectly:
✅ **Offline-first** - app works without internet  
✅ **Fast** - no API delays  
✅ **Reliable** - data never lost  
✅ **Central control** - you update plans from Google Sheets  

---

## 🎨 App Icons & Splash Screens

Generate app icons for all sizes:

1. **Create a 1024x1024px icon** (your flame logo)
2. **Use a tool like:**
   - https://capacitorjs.com/docs/guides/splash-screens-and-icons
   - https://www.appicon.co
3. **Replace default icons** in `ios/App/Assets.xcassets` and `android/app/src/main/res`

---

## 🔐 Environment Variables

For mobile apps, your `.env` variables are baked into the build:

```
VITE_GOOGLE_SHEETS_API_KEY=...
VITE_MASTER_SHEET_ID=...
```

These are included in the `dist/` build and copied to native apps.

**Important:** Don't commit `.env` to git! (Already in `.gitignore`)

---

## 📱 App Store Requirements

### iOS App Store
- **Privacy Policy** URL (required)
- **Screenshots** (6.7", 6.5", 5.5" iPhone sizes)
- **App Description** (up to 4000 characters)
- **Keywords** (for search optimization)
- **Review Notes** (explain Google Sheets integration)

### Google Play Store
- **Privacy Policy** URL (required)
- **Screenshots** (phone, tablet, optionally)
- **Feature Graphic** (1024x500px)
- **App Description** (up to 4000 characters)
- **Content Rating** questionnaire

---

## 🚀 Next Steps

1. ✅ **Test on real devices** (iOS and Android)
2. ✅ **Get feedback** from Barbara and other users
3. ✅ **Polish UI/UX** based on mobile testing
4. ✅ **Prepare app store assets** (icons, screenshots, descriptions)
5. ✅ **Submit to TestFlight** (iOS beta)
6. ✅ **Submit to Google Play Internal Testing** (Android beta)
7. ✅ **Gather reviews** and iterate
8. ✅ **Public release!** 🎉

---

## 📚 Useful Resources

- [Capacitor Docs](https://capacitorjs.com/docs)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Android Material Design](https://material.io/design)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

---

## 🆘 Troubleshooting

### iOS pod install errors
- Install CocoaPods: `sudo gem install cocoapods`
- Run `pod install` in `ios/App/` directory

### Android Gradle sync errors
- Ensure Java 11 or higher is installed
- Open in Android Studio and let it auto-fix dependencies

### App doesn't update after code changes
- Rebuild: `npm run build && npx cap sync`
- Clean build in Xcode/Android Studio

### LocalStorage not persisting
- Check Capacitor Preferences plugin is installed
- Verify `@capacitor/preferences` is in `package.json`

---

**Good luck with your app launch! 🚀💪**

