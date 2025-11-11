# 📸 Share Workout - Visual Mockup

## 🎨 What the User Sees

### **Step 1: Today Page (Native App Only)**

```
┌─────────────────────────────────┐
│  RoxPT                    🔔 ⚙️ │
├─────────────────────────────────┤
│                                 │
│  📅 Training Day 5              │
│  Monday                         │
│                                 │
│  ┌─────────────────────────┐   │
│  │ 💪 Strength Lower       │   │
│  │ Building foundational   │   │
│  │ leg strength...         │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Dumbbell Goblet Squat   │   │
│  │ 3 × 12 • 20kg           │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Back Squat              │   │
│  │ 4 × 8 • 60kg            │   │
│  └─────────────────────────┘   │
│                                 │
│  ... more exercises ...         │
│                                 │
│  ┌─────────────────────────┐   │
│  │ [Skip Day] [Complete]   │   │
│  │ [Share Workout 📸]      │ ← │
│  └─────────────────────────┘   │
└─────────────────────────────────┘
```

---

### **Step 2: Share Dialog Opens**

```
┌─────────────────────────────────┐
│  Share Your Progress       ✕    │
├─────────────────────────────────┤
│                                 │
│  Take a selfie and share your   │
│  workout with friends!          │
│                                 │
│  ┌─────────────────────────┐   │
│  │                         │   │
│  │    📸 Take Selfie       │   │
│  │                         │   │
│  └─────────────────────────┘   │
│                                 │
└─────────────────────────────────┘
```

---

### **Step 3: Camera Opens (Native)**

```
┌─────────────────────────────────┐
│  ◀ Cancel              Flip 🔄  │
├─────────────────────────────────┤
│                                 │
│                                 │
│         [CAMERA VIEW]           │
│      (User's selfie mode)       │
│                                 │
│                                 │
│                                 │
│         ⚪ Take Photo            │
│                                 │
└─────────────────────────────────┘
```

---

### **Step 4: Photo Preview with Overlay**

```
┌─────────────────────────────────┐
│  Share Your Progress       ✕    │
├─────────────────────────────────┤
│  ┌─────────────────────────┐   │
│  │      RoxPT              │   │ ← Yellow logo
│  │                         │   │
│  │   [USER'S SELFIE]       │   │
│  │                         │   │
│  │  ╔═══════════════════╗  │   │
│  │  ║ Strength Lower    ║  │   │ ← Workout name
│  │  ║ 11 Nov 2025•14:30 ║  │   │ ← Date/time (yellow)
│  │  ║                   ║  │   │
│  │  ║ • Goblet Squat    ║  │   │
│  │  ║   3×12 • 20kg     ║  │   │
│  │  ║ • Back Squat      ║  │   │
│  │  ║   4×8 • 60kg      ║  │   │
│  │  ║ • RDL             ║  │   │
│  │  ║   3×12 • 40kg     ║  │   │
│  │  ║ ...and 5 more     ║  │   │ ← If more exercises
│  │  ╚═══════════════════╝  │   │
│  └─────────────────────────┘   │
│                                 │
│  ┌──────────┐ ┌──────────────┐ │
│  │ Retake   │ │ Share 📤     │ │
│  └──────────┘ └──────────────┘ │
└─────────────────────────────────┘
```

---

### **Step 5: Native Share Dialog**

```
┌─────────────────────────────────┐
│  Share                          │
├─────────────────────────────────┤
│  Just crushed this workout      │
│  with RoxPT! 💪                 │
│                                 │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐      │
│  │📷 │ │📘│ │💬│ │📧│      │
│  │IG │ │FB │ │TXT│ │ML │      │
│  └───┘ └───┘ └───┘ └───┘      │
│                                 │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐      │
│  │💾│ │📋│ │...│ │   │      │
│  │SAV│ │CPY│ │MOR│ │   │      │
│  └───┘ └───┘ └───┘ └───┘      │
│                                 │
│         [Cancel]                │
└─────────────────────────────────┘
```

---

## 🎯 Overlay Design Breakdown

### **Colors:**
- **Logo:** `#FFCC00` (RoxPT yellow)
- **Date/Time:** `#FFCC00` (yellow)
- **Workout Name:** `#FFFFFF` (white)
- **Exercise List:** `#FFFFFF` (white)
- **Background Gradient:** 
  - Top: `rgba(0,0,0,0)` (transparent)
  - Middle: `rgba(0,0,0,0.7)` (70% black)
  - Bottom: `rgba(0,0,0,0.95)` (95% black)

### **Typography:**
- **Logo:** Bold 48px sans-serif
- **Workout Name:** Bold 36px sans-serif
- **Date/Time:** 24px sans-serif
- **Exercise List:** 20px sans-serif (32px line height)

### **Layout:**
- **Logo:** Top center, 80px from top
- **Workout Name:** Centered, 60px below logo
- **Date/Time:** Centered, 50px below workout name
- **Exercise List:** Left-aligned, 60px left margin
- **Overlay Height:** 40% of image height

---

## 📱 Platform Behavior

### **Native Apps (iOS/Android):**
✅ Share button visible  
✅ Camera access works  
✅ Native share dialog  
✅ Can share to Instagram, Facebook, Messages, etc.  

### **PWA/Web:**
❌ Share button hidden  
❌ No camera access  
❌ Feature not available  

**Detection:**
```typescript
const isNativeApp = Capacitor.isNativePlatform();
// true = iOS/Android
// false = PWA/Web
```

---

## 🔐 Permissions Flow

### **First Time:**
```
User taps "Take Selfie 📸"
    ↓
Native permission dialog appears:
"RoxPT would like to access your camera"
    ↓
User taps "Allow" or "Don't Allow"
    ↓
If allowed: Camera opens
If denied: Toast notification
```

### **Subsequent Times:**
```
User taps "Take Selfie 📸"
    ↓
Camera opens immediately
(No permission dialog)
```

---

## 📊 Example Overlay Output

### **Workout with Multiple Exercises:**

```
      RoxPT
      
  [USER SELFIE PHOTO]
  
  ╔════════════════════════╗
  ║ Strength Lower         ║
  ║ 11 Nov 2025 • 14:30    ║
  ║                        ║
  ║ • Goblet Squat         ║
  ║   3×12 • 20kg          ║
  ║ • Back Squat           ║
  ║   4×8 • 60kg           ║
  ║ • RDL                  ║
  ║   3×12 • 40kg          ║
  ║ • Leg Press            ║
  ║   3×12 • 80kg          ║
  ║ • Plank                ║
  ║   45sec                ║
  ║ ...and 3 more          ║
  ╚════════════════════════╝
```

### **Running Workout:**

```
      RoxPT
      
  [USER SELFIE PHOTO]
  
  ╔════════════════════════╗
  ║ Long Run               ║
  ║ 11 Nov 2025 • 06:30    ║
  ║                        ║
  ║ • Easy Z2 Run          ║
  ║   10km • 60min         ║
  ║ • Cool Down Walk       ║
  ║   5min                 ║
  ╚════════════════════════╝
```

### **Cardio Circuit:**

```
      RoxPT
      
  [USER SELFIE PHOTO]
  
  ╔════════════════════════╗
  ║ Race Simulation        ║
  ║ 11 Nov 2025 • 18:00    ║
  ║                        ║
  ║ • Run                  ║
  ║   1km                  ║
  ║ • Sled Push            ║
  ║   50m • 102kg          ║
  ║ • SkiErg               ║
  ║   1km                  ║
  ║ • Wall Balls           ║
  ║   100 reps • 9kg       ║
  ║ ...and 4 more          ║
  ╚════════════════════════╝
```

---

## ✅ Ready to Test!

**To test on native app:**
1. Build and install on iOS/Android device
2. Complete a workout
3. Scroll to bottom of Today page
4. Tap "Share Workout 📸"
5. Take selfie
6. Share to Instagram/Facebook

**Expected result:**
- Photo with RoxPT branding
- Workout stats overlaid
- Professional-looking share image
- Drives social engagement 🚀

