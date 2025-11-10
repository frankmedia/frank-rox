# 🏃‍♂️ Cardio & Recovery Workout Implementation Plan

## 📋 Current Status

### ✅ Completed:
- **Running Workouts** - Long Run, Intervals, Tempo, Hills, Recovery, Fartlek, Progression
- **Strength Workouts** - Lower Body, Upper Body, Full Body with personalized weights

### ❌ To Implement:
1. **Cardio/Conditioning Workouts**
2. **Recovery/Mobility Workouts**

---

## 🎯 Cardio/Conditioning Workouts

### Types of Cardio Sessions:

#### 1. **Race Simulation**
- **Format:** Circuit/AMRAP
- **Structure:** 4 rounds of mixed modalities
- **Example:** 1km run + 50m sled push + 500m SkiErg
- **Rest:** 3 min between rounds
- **Effort:** Hard
- **Duration:** 40-60 min total

#### 2. **Engine Work**
- **Format:** Intervals
- **Structure:** Mixed cardio machines
- **Example:** 30 min mixed: RowErg, SkiErg, Assault Bike
- **Work/Rest:** 2min on / 1min off
- **Effort:** Moderate
- **Duration:** 30-45 min

#### 3. **HIIT Conditioning**
- **Format:** HIIT
- **Structure:** Short bursts, short rest
- **Example:** 8 rounds: 30s SkiErg / 30s rest
- **Effort:** Hard
- **Duration:** 20-30 min

---

## 🧘 Recovery/Mobility Workouts

### Types of Recovery Sessions:

#### 1. **Active Recovery**
- **Format:** Low-intensity movement
- **Structure:** Yoga, stretching, foam rolling
- **Duration:** 20-30 min
- **Effort:** Easy

#### 2. **Mobility Work**
- **Format:** Structured mobility routine
- **Structure:** Hip, shoulder, ankle mobility
- **Duration:** 15-20 min
- **Effort:** Easy

---

## 🛠️ Implementation Strategy

### Phase 1: Cardio Generator (`cardioGenerator.ts`)

Create a new file similar to `runGenerator.ts` with:

```typescript
export async function createCardioSession(
  supabase: SupabaseClient,
  planDayId: string,
  sessionType: "race-simulation" | "engine-work" | "hiit",
  options: CardioOptions
): Promise<void>
```

**Session Types:**

1. **Race Simulation**
   - Create a circuit with multiple exercises
   - Each exercise: distance/duration + modality
   - Add rest between rounds

2. **Engine Work**
   - Create interval blocks
   - Rotate between machines (RowErg, SkiErg, Bike)
   - 2min work / 1min rest format

3. **HIIT**
   - Short work periods (20-30s)
   - Short rest (10-30s)
   - High intensity

### Phase 2: Recovery Generator (`recoveryGenerator.ts`)

Create a new file with:

```typescript
export async function createRecoverySession(
  supabase: SupabaseClient,
  planDayId: string,
  sessionType: "active-recovery" | "mobility",
  options: RecoveryOptions
): Promise<void>
```

**Session Types:**

1. **Active Recovery**
   - Yoga poses (hold durations)
   - Foam rolling (muscle groups)
   - Dynamic stretching

2. **Mobility**
   - Hip mobility drills
   - Shoulder mobility drills
   - Ankle mobility drills

---

## 📊 Database Structure

### Cardio Workouts:

```typescript
// Example: Race Simulation
Session: "Race Simulation"
  Block 1: "Circuit" (rounds: 4, rest: 180s)
    Item 1: Run - 1km
    Item 2: Sled Push - 50m
    Item 3: SkiErg - 500m
```

### Recovery Workouts:

```typescript
// Example: Active Recovery
Session: "Active Recovery"
  Block 1: "Yoga Flow"
    Item 1: Downward Dog - 60s
    Item 2: Pigeon Pose - 60s (each side)
    Item 3: Child's Pose - 60s
  Block 2: "Foam Rolling"
    Item 1: Quads - 90s
    Item 2: Hamstrings - 90s
    Item 3: IT Band - 90s
```

---

## 🎯 Next Steps

1. ✅ Create `cardioGenerator.ts`
2. ✅ Create `recoveryGenerator.ts`
3. ✅ Update `programmeToDatabase.ts` to use new generators
4. ✅ Test cardio workouts display correctly
5. ✅ Test recovery workouts display correctly
6. ✅ Verify progressive overload for cardio (Week 2)

---

## 🔥 Cardio Exercise Database

We need to ensure these exercises exist in the `exercises` table:

### Cardio Machines:
- RowErg / Rowing Machine
- SkiErg
- Assault Bike / Air Bike
- Echo Bike

### Functional Movements:
- Sled Push
- Sled Pull
- Farmer's Carry
- Sandbag Lunges
- Wall Balls
- Burpees
- Box Jumps

### Mobility/Recovery:
- Yoga Flow
- Foam Rolling
- Dynamic Stretching
- Hip Mobility
- Shoulder Mobility
- Ankle Mobility

---

## 📝 Notes

- Cardio workouts should integrate with existing circuit/HIIT timer components
- Recovery workouts should use countdown timers (like mobility exercises)
- Progressive overload for cardio: +5-10% distance/duration or +1-2 rounds
- Recovery workouts don't need progressive overload (stay consistent)

