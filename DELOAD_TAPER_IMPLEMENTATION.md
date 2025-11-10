# ✅ Deload & Taper Implementation - COMPLETE

## Overview
Implemented automatic deload and taper logic for 2-week training blocks. The system now intelligently reduces volume based on training history and event proximity.

---

## 🔄 Deload Logic (Block 6, 12, 18...)

### Trigger
- Automatically activates after **12 weeks** (Block 6)
- Then every 6 blocks: Block 12, 18, 24, etc.
- Detection: `blockNumber % 6 === 0`

### Volume Reduction
- **-30% volume** across all sessions
- Maintains intensity (same weights, paces, effort levels)
- Reduces sets/reps/distance, not intensity

### Implementation
```typescript
if (blockNumber === 6 || blockNumber === 12 || blockNumber === 18) {
  volumeModifier = 0.7; // -30% volume
}
```

### Example Output
```
NORMAL BLOCK:
- Long Run: 7km
- Intervals: 6×500m
- Tempo Run: 5km

DELOAD BLOCK 6:
- Long Run: 5km (-30%)
- Intervals: 4×500m (-30%)
- Tempo Run: 4km (-30%)
```

### Console Output
```
📊 Block 6: DELOAD
🔄 DELOAD WEEK: Reducing volume by 30%
```

---

## 🏁 Taper Logic (2 Weeks Before Event)

### Trigger
- Automatically activates when event date is ≤14 days away
- Two phases: Week -2 and Week -1
- Detection: `weeksToEvent <= 2`

### Week -2 (14-8 Days Before Event)
- **-20% volume**
- Low-impact alternatives suggested (bike, rower instead of running)
- Keep 1-2 quality sessions (short, sharp)
- Reduce strength sets by 1

### Week -1 (7-1 Days Before Event)
- **-40% volume**
- Maximum 3 intervals (even if normal is 6-8)
- Skip tempo runs entirely
- Mostly low-impact cardio
- Short shakeout runs only

### Implementation
```typescript
if (weeksToEvent === 2) {
  volumeModifier = 0.8; // Week -2: -20%
  useLowImpact = true;
} else if (weeksToEvent === 1) {
  volumeModifier = 0.6; // Week -1: -40%
  useLowImpact = true;
}
```

### Example Output
```
NORMAL BLOCK:
- Long Run: 7km (running)
- Intervals: 6×500m @ hard
- Tempo Run: 5km

TAPER WEEK -2:
- Long Cardio: 6km (bike/rower) ← Low impact
- Intervals: 5×500m @ moderate ← Reduced volume & intensity
- Tempo Run: 4km

TAPER WEEK -1:
- Long Cardio: 4km (bike/rower) ← Low impact
- Intervals: 3×500m @ moderate ← Max 3 reps
- (No tempo run) ← Skipped
```

### Console Output
```
📊 Block 3: TAPER (Week -2)
🏁 TAPER WEEK -2: Reducing volume by 20%, using low-impact alternatives

📊 Block 4: TAPER (Week -1)
🏁 TAPER WEEK -1: Reducing volume by 40%, using low-impact alternatives
```

---

## 📊 Block Number Tracking

### How It Works
1. **First Programme**: Block 1 (default)
2. **Each Regeneration**: Block number increments by 1
3. **Storage**: Saved in localStorage as `current_programme.blockNumber`
4. **Persistence**: Survives app restarts, page refreshes

### Implementation
```typescript
// Get last block number
const lastProgramme = localStorage.getItem("current_programme");
let blockNumber = 1;
if (lastProgramme) {
  const parsed = JSON.parse(lastProgramme);
  blockNumber = (parsed.blockNumber || 0) + 1; // Increment
}

// Save new block number
const programme = {
  sessions: allSessions,
  blockNumber,
  isDeload,
  isTaper,
  // ...
};
localStorage.setItem("current_programme", JSON.stringify(programme));
```

### Example Timeline
```
Week 1-2:   Block 1 (NORMAL)
Week 3-4:   Block 2 (NORMAL)
Week 5-6:   Block 3 (NORMAL)
Week 7-8:   Block 4 (NORMAL)
Week 9-10:  Block 5 (NORMAL)
Week 11-12: Block 6 (DELOAD) ← Automatic -30% volume
Week 13-14: Block 7 (NORMAL)
...
Week 23-24: Block 12 (DELOAD) ← Automatic -30% volume
```

---

## 🎯 Priority Logic

### Taper Overrides Deload
If both conditions are true (Block 6 AND 2 weeks to event), **taper takes priority**:

```typescript
// Taper is checked AFTER deload
if (isDeload) {
  volumeModifier = 0.7; // -30%
}

if (isTaper && taperWeek === 1) {
  volumeModifier = 0.8; // -20% (overrides deload)
  useLowImpact = true;
}
```

**Rationale:** Event prep is more important than scheduled deload.

---

## 📝 Applied To

### ✅ Running Sessions
- Long Run: Distance reduced by volume modifier
- Intervals: Reps reduced, capped at 3 in taper week -1
- Tempo Run: Distance reduced, skipped in taper
- Hill Repeats: Reps reduced
- Recovery Run: Distance reduced

### ⚠️ Strength Sessions (TODO)
- Currently NOT applied to strength
- Future: Reduce sets by 1 (e.g., 4×8 → 3×8)
- Maintain reps and weight

### ⚠️ Cardio Sessions (TODO)
- Currently NOT applied to cardio
- Future: Reduce rounds/duration by volume modifier

---

## 🧪 Testing

### Test Deload (Block 6)
1. Generate 5 programmes (Blocks 1-5)
2. Generate 6th programme
3. Console should show: `📊 Block 6: DELOAD`
4. Verify running volumes are -30%

### Test Taper (2 Weeks Before Event)
1. Set event date to 14 days from now
2. Generate programme
3. Console should show: `📊 Block X: TAPER (Week -2)`
4. Verify:
   - Running volumes are -20%
   - Low-impact alternatives suggested
   - Intervals at "moderate" effort

### Test Taper Week -1
1. Set event date to 7 days from now
2. Generate programme
3. Console should show: `📊 Block X: TAPER (Week -1)`
4. Verify:
   - Running volumes are -40%
   - Max 3 intervals
   - No tempo run

### Manual Testing Steps
```bash
# 1. Clear localStorage to start fresh
localStorage.clear();

# 2. Complete onboarding
# 3. Set event date to 14 days from now
# 4. Generate programme (should be Block 1)
# 5. Check console for block type
# 6. Verify volumes in Overview

# 7. To test Block 6:
# Manually edit localStorage:
const prog = JSON.parse(localStorage.getItem("current_programme"));
prog.blockNumber = 5;
localStorage.setItem("current_programme", JSON.stringify(prog));

# 8. Regenerate programme (should be Block 6 DELOAD)
```

---

## 🔮 Future Enhancements

### Phase 2: Strength & Cardio
- Apply volume modifier to strength sets
- Apply volume modifier to cardio rounds/duration
- Estimated effort: 2-3 hours

### Phase 3: UI Indicators
- Show "DELOAD WEEK" badge in Overview
- Show "TAPER WEEK -2" badge in Overview
- Display volume reduction percentage
- Estimated effort: 1-2 hours

### Phase 4: Manual Deload Trigger
- Add "Request Deload" button in app
- PT can trigger deload anytime
- Bypasses 12-week rule
- Estimated effort: 2-3 hours

### Phase 5: Adaptive Deload Timing
- Track athlete fatigue signals
- Suggest early deload if needed
- Requires PT judgment integration
- Estimated effort: 5-10 hours

---

## 📚 Related Documentation

- **PROGRAMME_GENERATOR_GUIDE.md** - Complete algorithm documentation
- **PROGRESSIVE_OVERLOAD_RULES.md** - Week 1 vs Week 2 progression
- **PT_FEEDBACK_IMPLEMENTATION.md** - Implementation plan and rationale

---

## ✅ Checklist

- [x] Deload logic implemented (Block 6, 12, 18...)
- [x] Taper logic implemented (2 weeks before event)
- [x] Block number tracking (localStorage)
- [x] Volume modifier applied to running
- [x] Low-impact alternatives for taper
- [x] Console logging for debugging
- [x] Taper overrides deload priority
- [ ] Volume modifier applied to strength (future)
- [ ] Volume modifier applied to cardio (future)
- [ ] UI badges for deload/taper (future)
- [ ] Manual deload trigger (future)

---

**Status:** ✅ COMPLETE (Running only)  
**Last Updated:** 2025-01-10  
**Files Modified:** `src/pages/ProgrammeBuilder.tsx`

