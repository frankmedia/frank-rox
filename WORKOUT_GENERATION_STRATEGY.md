# Workout Generation Strategy for Personalized Programmes

## Overview

This document explains how to convert the high-level training programme (e.g., "Strength Lower + Easy Engine") into actual workouts with specific exercises from the database.

---

## Current System Architecture

### Existing Generators (Already Built)

**Location:** `/src/services/generators/`

1. **`hyroxGenerator.ts`** - Generates HYROX-style workouts
   - Creates sessions with running + stations
   - Balanced/Strength/Engine templates
   - Uses exercises from database

2. **`strengthGenerator.ts`** - Generates strength training workouts
   - Push/Pull/Legs splits
   - Full body workouts
   - Intensity levels (Easy/Moderate/Hard)

3. **`runGenerator.ts`** ✅ **COMPLETE** - Running workouts
   - 7 session types: Long Run, Intervals, Tempo, Hills, Recovery, Fartlek, Progression
   - Distance and pace prescriptions
   - Automatic warm-up/cool-down blocks
   - Progressive overload support

### Database Structure

**Tables:**
- `plans` - Training plan (e.g., "2-Week Block 1")
- `plan_days` - Individual days within a plan
- `sessions` - Training sessions for a day
- `session_blocks` - Blocks within a session (e.g., "Warm-up", "Main Work")
- `session_block_items` - Individual exercises
- `exercises` - Exercise library

---

## Integration Strategy

### Phase 1: Map Programme Sessions to Generators

When the programme builder creates a session like:
```typescript
{
  day: "Monday",
  type: "strength",
  title: "Strength Lower + Easy Engine",
  detail: "Back squats, Bulgarian split squats, RDLs + 20min Z2 RowErg",
  effort: "hard"
}
```

**We need to:**
1. Create a `plan` in database (if not exists)
2. Create `plan_days` for each day (Monday-Sunday × 2 weeks)
3. For each session, call the appropriate generator
4. Store the generated workout

---

## Session Type → Generator Mapping

### 1. Running Sessions

| Session Title | Generator | Template | Parameters |
|--------------|-----------|----------|------------|
| **Long Run** | `runGenerator` | `long_run` | `{ distance: "6-8km", pace: "Z2", duration: "45-60min" }` |
| **Intervals** | `runGenerator` | `intervals` | `{ reps: 6, distance: "500m", pace: "race", rest: "90s" }` |
| **Tempo Run** | `runGenerator` | `tempo` | `{ distance: "4km", pace: "Z3" }` |
| **Hill Repeats** | `runGenerator` | `hills` | `{ reps: 6, distance: "200m", effort: "hard" }` |
| **Recovery Run** | `runGenerator` | `recovery` | `{ distance: "3-4km", pace: "Z1" }` |

**Implementation:**
```typescript
async function generateRunSession(
  supabase: SupabaseClient,
  planDayId: string,
  sessionConfig: {
    title: string;
    distance?: string;
    pace?: string;
    reps?: number;
    rest?: string;
  }
) {
  // Create session
  const sessionId = await getOrCreateSession(supabase, planDayId, sessionConfig.title);
  
  // Find "Run" exercise in database
  const runExerciseId = await findRunExerciseId(supabase);
  
  // Create blocks based on session type
  if (sessionConfig.title.includes("Intervals")) {
    // Warm-up block
    const warmupId = await createBlock(supabase, sessionId, "cardio", "Warm-up");
    await addItem(supabase, warmupId, runExerciseId, 0);
    // Set: 10min easy
    
    // Main work block
    const mainId = await createBlock(supabase, sessionId, "intervals", "Intervals");
    await addItem(supabase, mainId, runExerciseId, 0);
    // Set: 6×500m @ race pace, 90s rest
    
    // Cool-down block
    const cooldownId = await createBlock(supabase, sessionId, "cardio", "Cool-down");
    await addItem(supabase, cooldownId, runExerciseId, 0);
    // Set: 5min easy
  } else if (sessionConfig.title.includes("Long Run")) {
    // Single block
    const blockId = await createBlock(supabase, sessionId, "cardio", "Long Run");
    await addItem(supabase, blockId, runExerciseId, 0);
    // Set: 45-60min @ Z2
  }
  // ... other session types
}
```

---

### 2. Strength Sessions

| Session Title | Generator | Template | Parameters |
|--------------|-----------|----------|------------|
| **Strength Lower + Easy Engine** | `strengthGenerator` + `hyroxGenerator` | `legs` + `engine` | `{ intensity: "hard", exercises: ["squat", "lunge", "rdl"], engine: "row" }` |
| **Strength Upper + Short Engine** | `strengthGenerator` + `hyroxGenerator` | `push_pull` + `engine` | `{ intensity: "hard", exercises: ["bench", "press", "pullup"], engine: "ski" }` |
| **Full Body Strength** | `strengthGenerator` | `full_body` | `{ intensity: "moderate" }` |

**Implementation:**
```typescript
async function generateStrengthSession(
  supabase: SupabaseClient,
  planDayId: string,
  sessionConfig: {
    title: string;
    split: "lower" | "upper" | "full_body";
    intensity: "easy" | "moderate" | "hard";
    includeEngine?: boolean;
    engineModality?: "row" | "ski" | "bike";
    engineDuration?: string;
  }
) {
  const sessionId = await getOrCreateSession(supabase, planDayId, sessionConfig.title);
  
  // Part 1: Strength work
  if (sessionConfig.split === "lower") {
    // Warm-up
    const warmupId = await createBlock(supabase, sessionId, "strength", "Warm-up");
    const gobletSquatId = await findExerciseIdByTerms(supabase, ["goblet squat"]);
    if (gobletSquatId) await addItem(supabase, warmupId, gobletSquatId.id, 0);
    // Set: 2×10 light
    
    // Main work
    const mainId = await createBlock(supabase, sessionId, "strength", "Lower Body");
    
    // Back Squat
    const squatId = await findExerciseIdByTerms(supabase, ["back squat", "squat"]);
    if (squatId) await addItem(supabase, mainId, squatId.id, 0);
    // Set: 4×6 @ 80%
    
    // Bulgarian Split Squat
    const bulgarianId = await findExerciseIdByTerms(supabase, ["bulgarian", "split squat"]);
    if (bulgarianId) await addItem(supabase, mainId, bulgarianId.id, 1);
    // Set: 3×8 each leg
    
    // RDL
    const rdlId = await findExerciseIdByTerms(supabase, ["rdl", "romanian deadlift"]);
    if (rdlId) await addItem(supabase, mainId, rdlId.id, 2);
    // Set: 3×10
  }
  
  // Part 2: Engine work (if included)
  if (sessionConfig.includeEngine) {
    const engineId = await createBlock(supabase, sessionId, "cardio", "Engine Work");
    
    const modality = sessionConfig.engineModality || "row";
    const exerciseId = await findExerciseIdByTerms(supabase, [modality, "erg"]);
    if (exerciseId) await addItem(supabase, engineId, exerciseId.id, 0);
    // Set: 20min @ Z2
  }
}
```

---

### 3. Cardio/Conditioning Sessions

| Session Title | Generator | Template | Parameters |
|--------------|-----------|----------|------------|
| **Race Simulation** | `hyroxGenerator` | `simulation` | `{ rounds: 4, stations: ["sled", "ski", "row"] }` |
| **Engine Work** | `hyroxGenerator` | `engine` | `{ duration: "30min", modalities: ["row", "ski", "bike"] }` |

**Implementation:**
```typescript
async function generateCardioSession(
  supabase: SupabaseClient,
  planDayId: string,
  sessionConfig: {
    title: string;
    type: "simulation" | "engine" | "intervals";
    rounds?: number;
    duration?: string;
    modalities?: string[];
  }
) {
  const sessionId = await getOrCreateSession(supabase, planDayId, sessionConfig.title);
  
  if (sessionConfig.type === "simulation") {
    // Race simulation: Run + Stations
    const blockId = await createBlock(supabase, sessionId, "circuit", "Race Simulation");
    
    // 4 rounds of:
    // 1. Run 1km
    const runId = await findRunExerciseId(supabase);
    if (runId) await addItem(supabase, blockId, runId, 0);
    // Set: 1km
    
    // 2. Sled push 50m
    const sledId = await findExerciseIdByTerms(supabase, ["sled push"]);
    if (sledId) await addItem(supabase, blockId, sledId.id, 1);
    // Set: 50m
    
    // 3. SkiErg 500m
    const skiId = await findExerciseIdByTerms(supabase, ["skierg", "ski"]);
    if (skiId) await addItem(supabase, blockId, skiId.id, 2);
    // Set: 500m
    
    // Rest: 3min between rounds
  } else if (sessionConfig.type === "engine") {
    // Mixed modality engine work
    const blockId = await createBlock(supabase, sessionId, "cardio", "Engine Work");
    
    // EMOM or continuous work with multiple modalities
    for (const modality of sessionConfig.modalities || ["row", "ski", "bike"]) {
      const exerciseId = await findExerciseIdByTerms(supabase, [modality]);
      if (exerciseId) await addItem(supabase, blockId, exerciseId.id);
    }
    // Set: 30min mixed @ Z2
  }
}
```

---

### 4. Recovery Sessions

| Session Title | Generator | Template | Parameters |
|--------------|-----------|----------|------------|
| **Active Recovery** | Custom | `recovery` | `{ activities: ["yoga", "foam rolling", "stretching"] }` |

**Implementation:**
```typescript
async function generateRecoverySession(
  supabase: SupabaseClient,
  planDayId: string,
  sessionConfig: {
    title: string;
    duration: string;
  }
) {
  const sessionId = await getOrCreateSession(supabase, planDayId, sessionConfig.title);
  const blockId = await createBlock(supabase, sessionId, "cardio", "Recovery");
  
  // Yoga
  const yogaId = await findExerciseIdByTerms(supabase, ["yoga"]);
  if (yogaId) await addItem(supabase, blockId, yogaId.id, 0);
  
  // Foam rolling
  const foamId = await findExerciseIdByTerms(supabase, ["foam roll"]);
  if (foamId) await addItem(supabase, blockId, foamId.id, 1);
  
  // Stretching
  const stretchId = await findExerciseIdByTerms(supabase, ["stretch", "mobility"]);
  if (stretchId) await addItem(supabase, blockId, stretchId.id, 2);
}
```

---

## Implementation Plan

### Step 1: Create Plan in Database

When user hits "Let's Go" and programme is generated:

```typescript
// In ProgrammeBuilder.tsx
const programme = {
  sessions: allSessions, // Array of session configs
  preferences: userPrefs,
  generatedAt: new Date().toISOString(),
  blockNumber: 1,
  focus
};

// NEW: Also create in database
const planId = await createPlanInDatabase(programme);
```

### Step 2: Generate Workouts for Each Day

```typescript
async function createPlanInDatabase(programme: any) {
  const supabase = getSupabaseClient();
  const user = getCurrentUser();
  
  // 1. Create plan
  const { data: plan } = await supabase
    .from("plans")
    .insert({
      client_id: user.clientId,
      name: `Block ${programme.blockNumber} - ${programme.focus}`,
      start_date: new Date().toISOString(),
      end_date: addDays(new Date(), 14).toISOString(),
      status: "active"
    })
    .select()
    .single();
  
  // 2. Create plan_days (14 days)
  const planDays = [];
  for (let i = 0; i < 14; i++) {
    const dayDate = addDays(new Date(), i);
    const dayName = days[i % 7];
    
    const { data: planDay } = await supabase
      .from("plan_days")
      .insert({
        plan_id: plan.id,
        day_date: dayDate.toISOString(),
        day_name: dayName,
        status: "pending"
      })
      .select()
      .single();
    
    planDays.push(planDay);
  }
  
  // 3. Generate workouts for each session
  for (let i = 0; i < programme.sessions.length; i++) {
    const session = programme.sessions[i];
    const weekNum = i < 7 ? 1 : 2;
    const dayIndex = i % 7;
    const planDay = planDays[i];
    
    // Call appropriate generator based on session type
    switch (session.type) {
      case "run":
        await generateRunSession(supabase, planDay.id, session);
        break;
      case "strength":
        await generateStrengthSession(supabase, planDay.id, session);
        break;
      case "cardio":
        await generateCardioSession(supabase, planDay.id, session);
        break;
      case "recovery":
        await generateRecoverySession(supabase, planDay.id, session);
        break;
    }
  }
  
  return plan.id;
}
```

### Step 3: Display Workouts in Today/Overview

Once workouts are generated in the database, the existing `Today` and `Overview` pages will automatically show them because they already query:

```typescript
// Existing code in Today.tsx
const { data: planDays } = await supabase
  .from("plan_days")
  .select(`
    *,
    sessions (
      *,
      session_blocks (
        *,
        session_block_items (
          *,
          exercises (*)
        )
      )
    )
  `)
  .eq("day_date", today)
  .eq("status", "active");
```

---

## Benefits of This Approach

### ✅ Reuses Existing Infrastructure
- Workout generators already built and tested
- Database schema already supports this
- Today/Overview pages already display workouts

### ✅ Consistent with Current UX
- Same workout cards as HYROX/Strength buttons
- Same exercise library
- Same tracking and completion flow

### ✅ Scalable
- Easy to add new session types
- Can customize workouts per athlete
- PT can review/modify generated workouts

### ✅ Offline + Online
- Programme generation works offline (local storage)
- Workout generation requires internet (database)
- Can show "Generate Workouts" button when online

---

## User Flow

### Current Flow (Programme Only)
1. Complete onboarding
2. Customize programme
3. View 14-day schedule (high-level)
4. Click "Start Training"
5. See Overview (no actual workouts yet)

### New Flow (With Workout Generation)
1. Complete onboarding
2. Customize programme
3. View 14-day schedule (high-level)
4. Click "Start Training"
5. **[NEW]** Show loader: "Generating your workouts..."
6. **[NEW]** Call workout generators for each day
7. **[NEW]** Save to database
8. Navigate to Overview
9. See actual workouts with exercises

---

## Implementation Priority

### Phase 1: Running Sessions (Easiest)
- Long runs
- Intervals
- Tempo runs
- Recovery runs

**Why first?**
- Simplest: Usually just "Run" exercise with different sets
- Most users have running in their programme
- Quick win to test the system

### Phase 2: Strength Sessions
- Lower body
- Upper body
- Full body

**Why second?**
- More complex: Multiple exercises per session
- Requires exercise database lookups
- Need to handle equipment availability

### Phase 3: Cardio/Conditioning
- Race simulations
- Engine work
- Mixed modality

**Why third?**
- Most complex: Multiple modalities
- Depends on equipment access
- Requires circuit/EMOM logic

### Phase 4: Recovery
- Yoga
- Mobility
- Stretching

**Why last?**
- Least critical for MVP
- Can be generic/template-based
- Often athlete-directed

---

## Next Steps

1. **Create `programmeToWorkouts.ts` service**
   - Central orchestrator for workout generation
   - Calls appropriate generators
   - Handles database transactions

2. **Update `ProgrammeBuilder.tsx`**
   - Add "Generating workouts..." step
   - Call `programmeToWorkouts` service
   - Handle errors gracefully

3. **Test with simple programme**
   - 3 days/week
   - 2 runs + 1 strength
   - Verify workouts appear in Today/Overview

4. **Expand to full programme**
   - All session types
   - 14 days
   - Progressive overload Week 1 → Week 2

---

## Questions for Review

1. **Should workout generation happen immediately or be deferred?**
   - Immediate: User waits longer but workouts ready instantly
   - Deferred: Fast onboarding, generate workouts overnight

2. **What if exercise not found in database?**
   - Skip exercise and log warning?
   - Use generic "Exercise" placeholder?
   - Show error to user?

3. **Should we allow PT to review before activating?**
   - Auto-activate for self-serve athletes
   - Pending review for PT clients

4. **How to handle equipment constraints?**
   - Use athlete's equipment selections from onboarding
   - Substitute exercises if equipment not available
   - Show warning if programme requires unavailable equipment

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**Status**: Strategy Document - Implementation Pending

