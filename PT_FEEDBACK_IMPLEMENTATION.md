# 🎯 PT Feedback Implementation Plan

## Summary
Natalie's feedback on progressive overload, session spacing, deloads, and taper protocols. This document outlines what we can automate vs. what requires PT judgment.

---

## ✅ IMPLEMENTED (Already Done)

### 1. Progressive Overload Rules
- ✅ +2 reps for main strength sets
- ✅ +15 seconds for timed exercises (cap at 2 min)
- ✅ Warm-ups stay at 10 reps (no progression)
- ✅ Running intervals stay same rounds (RPE-based progression)

### 2. Active Recovery
- ✅ Post-workout mobility after every training day (3-4 min)
- ✅ Full active recovery session on rest days (30 min)
- ✅ Zero overlap between sessions

### 3. Multi-Session Days
- ✅ Main workout + Post-workout mobility stacked
- ✅ Active recovery on rest days

---

## 🟢 CAN IMPLEMENT (Rule-Based Logic)

### 1. Deload Weeks (After 12 Weeks)
**Natalie's Guidance:**
> "If we need to program it in the app then after 12 weeks. Serious long distance runners should reload every 3-5 weeks."

**Implementation:**
```typescript
if (currentBlock >= 6) { // 6 blocks = 12 weeks
  // Deload week
  volume = baseVolume * 0.7; // -30% volume
  intensity = "moderate"; // Keep intensity, reduce sets/reps
  
  // Example:
  // Normal: 4×8 @ 55kg
  // Deload: 3×8 @ 55kg (one less set)
}
```

**Rules:**
- Trigger after **Block 6** (12 weeks)
- Reduce sets by 1 (4 sets → 3 sets)
- Keep reps and weight same
- Reduce running volume by 30% (8km → 6km)
- Keep intensity moderate (no max efforts)

**Priority:** HIGH (easy to implement, big impact)

---

### 2. Taper Protocol (2 Weeks Before Event)
**Natalie's Guidance:**
> "Reduce volume by 20-40%, use low-impact machines, keep quality sessions but shorter"

**Implementation:**
```typescript
const weeksToEvent = calculateWeeksToEvent(eventDate);

if (weeksToEvent <= 2) {
  // Taper mode
  runningVolume *= 0.6; // -40% running
  strengthSets -= 1; // Reduce sets
  
  // Replace high-impact with low-impact
  if (session.type === "run") {
    // Suggest: Rower, Ski Erg, Bike instead
    session.notes = "Consider low-impact alternative (rower/bike)";
  }
  
  // Keep quality, reduce duration
  if (session.intensity === "hard") {
    session.duration *= 0.7; // -30% duration
  }
}
```

**Rules:**
- **Week -2:** Reduce volume by 20%
- **Week -1:** Reduce volume by 40%
- Replace runs with rower/ski erg/bike
- Keep 1-2 quality sessions (short, sharp)
- No new exercises or heavy lifts

**Priority:** HIGH (event-driven, clear logic)

---

### 3. Session Spacing Logic (Muscle Group Rotation)
**Natalie's Guidance:**
> "Add upper body day after leg day or vice versa. Or lower body Zone 2 after upper body day."

**Implementation:**
```typescript
function buildWeekWithSpacing(preferences) {
  const schedule = [];
  let lastMuscleGroup = null;
  
  for (let day of trainingDays) {
    let session;
    
    if (lastMuscleGroup === "lower") {
      // After lower → upper OR Zone 2 cardio
      session = pickSession(["upper", "zone2_cardio"]);
    } else if (lastMuscleGroup === "upper") {
      // After upper → lower OR Zone 2 cardio
      session = pickSession(["lower", "zone2_cardio"]);
    } else if (lastIntensity >= 8) {
      // After hard session → easy/recovery
      session = pickSession(["recovery", "zone2"]);
    } else {
      // Normal rotation
      session = pickSession(preferences.focus);
    }
    
    schedule.push(session);
    lastMuscleGroup = session.muscleGroup;
    lastIntensity = session.intensity;
  }
  
  return schedule;
}
```

**Rules:**
- Track `muscleGroup` per session: "upper", "lower", "full", "cardio"
- Track `intensity` per session: 1-10 scale
- **After hard lower (8+):** → Upper OR Zone 2 cardio
- **After hard upper (8+):** → Lower OR Zone 2 cardio
- **After HIIT/intervals (9+):** → Easy/recovery
- **No back-to-back 9+ intensity days**

**Priority:** MEDIUM (improves recovery, prevents overtraining)

---

### 4. Double-Day Sessions (4+ Training Days)
**Natalie's Guidance:**
> "We should add the option. Also for 4+ sessions per week. Time constraints will be the biggest issue."

**Implementation:**
```typescript
if (trainingDaysPerWeek >= 4 && preferences.doubleDay === true) {
  // Add AM/PM split for some days
  const doubleDays = Math.min(2, trainingDaysPerWeek - 3); // Max 2 double days
  
  for (let i = 0; i < doubleDays; i++) {
    const day = trainingDays[i];
    
    // AM: Zone 2 Cardio (30 min)
    day.sessions.push({
      time: "AM",
      type: "cardio",
      intensity: "easy",
      duration: 30,
      title: "Morning Zone 2 Cardio"
    });
    
    // PM: Strength or HIIT
    day.sessions.push({
      time: "PM",
      type: "strength",
      intensity: "moderate",
      duration: 45,
      title: "Evening Strength Training"
    });
  }
}
```

**Rules:**
- Only for athletes training 4+ days/week
- Max 2 double-day sessions per week
- AM = Zone 2 cardio (30 min, low intensity)
- PM = Strength or HIIT (45-60 min)
- Separate by 6+ hours

**Priority:** LOW (advanced feature, time constraints)

---

### 5. Intensity Scoring System
**Purpose:** Better session spacing and recovery management

**Implementation:**
```typescript
function calculateIntensity(session): number {
  let score = 5; // Base moderate
  
  // Strength intensity
  if (session.type === "strength") {
    if (session.repRange === "4-6") score = 9; // Heavy
    if (session.repRange === "6-8") score = 7; // Moderate-heavy
    if (session.repRange === "8-12") score = 6; // Hypertrophy
  }
  
  // Running intensity
  if (session.type === "run") {
    if (session.format === "intervals") score = 9; // Hard
    if (session.format === "tempo") score = 7; // Moderate-hard
    if (session.format === "long") score = 5; // Easy-moderate
    if (session.format === "recovery") score = 2; // Easy
  }
  
  // Cardio intensity
  if (session.type === "cardio") {
    if (session.format === "hiit") score = 9; // Hard
    if (session.format === "circuit") score = 7; // Moderate-hard
    if (session.format === "zone2") score = 3; // Easy
  }
  
  return score;
}
```

**Intensity Scale:**
- 1-3: Easy (recovery, Zone 2)
- 4-6: Moderate (tempo, hypertrophy)
- 7-8: Hard (heavy strength, intervals)
- 9-10: Very Hard (max effort, HYROX sim)

**Priority:** MEDIUM (enables better spacing logic)

---

## 🔴 CANNOT AUTOMATE (Requires PT Judgment)

### 1. 10% Volume Progression
**Why not automate:**
- Too many variables: age, experience, starting point, fatigue, life stress
- "Feel on the day" cannot be programmed
- Individual response varies wildly

**Our approach:**
- Use **fixed progression rules** (+2 reps, +15 sec)
- PT adjusts in 2-week check-ins
- Better to be consistent than try to be "smart" and get it wrong

**Natalie's quote:**
> "Approximately 10% is a rough guideline. Depends on age, experience, starting point, if they know what going to failure feels like etc. Also can be different on the day."

---

### 2. Beginner Volume Caps
**Why not automate:**
- Natalie says **NO caps!** Beginners might need MORE volume to progress
- Low scores ≠ low capacity
- Volume needs depend on goals, not just current fitness

**Our approach:**
- Don't cap volume based on scores
- Use conservative starting weights (from 5RM data)
- Let PT adjust in check-ins

**Natalie's quote:**
> "No, they might need more volume to progress."

---

### 3. Deload Timing (Advanced Athletes)
**Why not automate:**
- Serious runners need deloads every 3-5 weeks
- Depends on training history, fatigue accumulation
- Requires subjective assessment

**Our approach:**
- Default: 12-week deload (safe for most)
- PT can manually trigger earlier deloads
- Add "Request Deload" button in app

---

## 📋 Implementation Priority

### Phase 1: HIGH PRIORITY (Next 2 weeks)
1. ✅ Deload week logic (after 12 weeks)
2. ✅ Taper protocol (2 weeks before event)
3. ✅ Intensity scoring system

### Phase 2: MEDIUM PRIORITY (Next 4 weeks)
4. ✅ Session spacing logic (muscle group rotation)
5. ✅ PT check-in prompts (2-week intervals)

### Phase 3: LOW PRIORITY (Future)
6. ✅ Double-day sessions (advanced feature)
7. ✅ Manual deload trigger (PT request)

---

## 🎓 Key Learnings

### What Works:
- **Rule-based systems** for deload, taper, spacing
- **Fixed progression** (+2 reps, +15 sec) over percentage-based
- **Conservative starting points** with PT adjustments
- **Intensity scoring** for better session management

### What Doesn't Work:
- Trying to automate "feel on the day"
- Percentage-based progression (too many variables)
- Capping volume for beginners (counterproductive)
- Over-engineering recovery (PT judgment > algorithm)

### The Balance:
> "Humans and situations have so many variables" - This is why we use **simple, consistent rules** that PTs can adjust, rather than trying to be too clever with automation.

---

## 📚 Resources

### Progressive Overload
- [NASM: Progressive Overload Explained](https://blog.nasm.org/progressive-overload-explained)
- Key quote: "5-10% weight increase when client can do 15-20 reps instead of 8-12"

### Deload & Taper
- [RMR Training: HYROX Training Program](https://www.rmr.training/blog/how-to-build-a-hyrox-training-program-that-actually-works)
- Key quote: "Every 3-4 weeks, cut volume by ~30%"

### Taper Protocol
- [RMR Training: How to Taper for HYROX](https://www.rmr.training/blog/how-to-taper-for-a-hyrox-race-a-complete-guide-from-rmr-training)
- Key quote: "Reduce volume 20-40%, use low-impact machines"

---

**Last Updated:** 2025-01-10  
**Next Review:** After implementing Phase 1 (deload + taper)

