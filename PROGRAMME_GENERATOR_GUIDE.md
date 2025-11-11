# Programme Generator Guide for Personal Trainers

## Overview

This document explains how the automated training programme generator works. The system creates personalized 2-week training blocks based on each athlete's goals, schedule, and current fitness level.

---

## User Input Collection (Onboarding)

### 1. Basics Screen

**Question: "What is your biological sex?"**
- Options: Male / Female / Other
- Purpose: Used for strength scoring benchmarks

**Question: "How old are you?"**
- Input: Numeric (years)
- Purpose: Age-adjusted performance expectations

---

### 2. Event Screen

**Question: "Are you training for an event?"**
- Options: Yes / No
- If Yes, show additional questions:

**Question: "What is the event name?"**
- Input: Text (e.g., "London HYROX", "Berlin Marathon")
- Purpose: Personalization and motivation

**Question: "When is the event?"**
- Input: Date picker
- Purpose: Calculates weeks to event, determines training phase
- Display: Shows "X weeks to event" with color coding:
  - Red: <2 weeks (very close)
  - Orange: 2-6 weeks (race prep)
  - Green: >6 weeks (build phase)

---

### 3. Strength Screen

**Question: "What is your best recent Bench Press (5 reps)?"**
- Options: 20kg / 40kg / 60kg / 80kg / 100kg / 120+kg / Not sure
- Purpose: Upper body pushing strength

**Question: "What is your best recent Back Squat (5 reps)?"**
- Options: 20kg / 40kg / 60kg / 80kg / 100kg / 120kg / 140+kg / Not sure
- Purpose: Lower body strength

**Question: "What is your best recent Deadlift (5 reps)?"**
- Options: 20kg / 40kg / 60kg / 80kg / 100kg / 120kg / 140+kg / Not sure
- Purpose: Posterior chain strength

**Question: "What is your best recent Overhead Press (5 reps)?"**
- Options: 5kg / 10kg / 20kg / 30kg / 40kg / 50kg / 60+kg / Not sure
- Purpose: Shoulder strength and stability

---

### 4. Running Screen

**Question: "How long do you run per week?"**
- Options: 0 / <30min / 30-60min / 1-2hrs / 2-3hrs / 3+hrs
- Purpose: Current running volume baseline

**Question: "Do you do interval sessions?"**
- Options: Yes / No
- Purpose: Current training sophistication

**Question: "Do you do hill sessions?"**
- Options: Yes / No
- Purpose: Determines if hill repeats should be included

**Question: "What is your best 5km time?"**
- Input: Two fields - Minutes (numeric) / Seconds (numeric)
- Example: 25 minutes, 30 seconds = 25:30
- Purpose: Running performance benchmark (heavily weighted in score)

**Question: "What is your best 10km time?"**
- Input: Two fields - Hours (numeric) / Minutes (numeric)
- Example: 0 hours, 52 minutes = 00:52:00
- Purpose: Endurance performance benchmark (heavily weighted in score)

---

### 5. Cardio & Conditioning Screen

**Question: "How many cardio sessions do you do per week (not including running)?"**
- Options: 0 / 1 / 2 / 3 / 4 / 5+
- Purpose: Non-running conditioning volume

**Question: "Which modalities do you use most often?"**
- Options: Multi-select checkboxes
  - RowErg
  - SkiErg
  - Assault Bike
  - Circuits
  - Other
- Purpose: Equipment familiarity and variety assessment

**Question: "What is your average duration (per session)?"**
- Options: <20min / 20-40min / 40-60min / 60+min
- Purpose: Session length and endurance capacity

**Question: "Do you do intervals or Zone 2 training?"**
- Options: No / Only intervals / Only Zone 2 / Both
- Purpose: Training intensity awareness

---

### 6. Mobility & Recovery Screen

**Question: "How much mobility work do you do per week?"**
- Options: None / <30min / 30-60min / 1-2hrs / 2+hrs
- Purpose: Recovery habits and injury prevention

**Question: "Do you do yoga?"**
- Options: Yes / No
- Purpose: Flexibility and mindfulness practices

---

### 7. Experience & Competition Screen

**Question: "Have you ever competed in a fitness event or race?"**
- Options: No / Once / 2-3 times / 4+ times
- Purpose: Competition experience level

**Question: "What was your best result?"**
- Options: Did Not Finish / Finished / Podium
- Purpose: Performance level and mental toughness
- Note: Only shown if athlete has competed before

---

### 8. Programme Customization Screen

**Question: "How many days per week can you train?"**
- Options: 1 / 2 / 3 / 4 / 5 / 6
- Purpose: Total training capacity per week
- Display: Large buttons in own card at top

**Question: "Would you like PT check-ins?"**
- Options: Yes / No
- Purpose: Identifies athletes interested in coaching upgrade
- Display: Own card below training days
- Note: If Yes, shows upgrade badge (£49.99)

**Question: "Which areas do you want to focus on?"**
- Options: Multi-select buttons
  - Running
  - Strength
  - Cardio
- Purpose: Programme prioritization
- Auto-selected: Any area where athlete scored <60
- Display: User can override pre-selections

**Question: "How many runs per week would you like?"**
- Options: 0 / 1 / 2 / 3 / 4 / 5
- Purpose: Running session frequency
- Display: Shown if Running is selected as focus

**Question: "Would you like hills or sprint sessions?"**
- Options: Yes / No
- Purpose: Determines if hill repeats are included
- Display: Only shown if runs per week > 1

**Question: "Do you have access to HYROX-style equipment?" (select all that apply)**
- Options: Multi-select checkboxes
  - Sled push/pull
  - Wall balls
  - Sandbags
  - Heavy dumbbells
  - SkiErg
  - RowErg
  - None
- Purpose: Equipment-based session design
- Display: Only shown if Strength is selected as focus

**Question: "Do you attend cardio classes (e.g. HIIT, CrossFit, circuit, spin)?"**
- Options: Never / 1× per week / 2-3× per week / 4+× per week
- Purpose: External cardio volume tracking
- Display: Only shown if Cardio is selected as focus

---

## Summary of All Inputs

### Stored in `onboarding_profile.answers`:
1. `gender` - Biological sex
2. `age` - Age in years
3. `trainingForEvent` - Yes/No
4. `eventName` - Text
5. `eventDate` - Date
6. `bench5rm` - Weight option
7. `squat5rm` - Weight option
8. `deadlift5rm` - Weight option
9. `ohp5rm` - Weight option
10. `runWeekly` - Time band
11. `intervals` - Yes/No
12. `hills` - Yes/No
13. `best5k_mm` - Minutes
14. `best5k_ss` - Seconds
15. `best10k_hh` - Hours
16. `best10k_mm` - Minutes
17. `cardioSessions` - Number
18. `cardioModalities` - Array
19. `cardioDuration` - Time band
20. `cardioIntervalZ2` - Training style
21. `mobility` - Time band
22. `yoga` - Yes/No
23. `competitionExperience` - Frequency
24. `competitionResult` - Result type

### Stored in `onboarding_profile.training_preferences`:
1. `trainingDaysPerWeek` - 1-6
2. `wantsPTCheckins` - Boolean
3. `focusAreas` - Array ["Running", "Strength", "Cardio"]
4. `runSessionsPerWeek` - 0-5
5. `hillsOrSprints` - Yes/No
6. `equipment` - Array (if Strength focus)
7. `cardioClassFrequency` - Frequency (if Cardio focus)

### 3. Programme Customization

**Training Schedule:**
- **Training days per week**: 1-6 days
- **Run sessions per week**: 0-5 runs
- **Hills/Sprint sessions**: Yes/No (if ≥2 runs/week)

**Focus Areas** (multi-select):
- Running
- Strength
- Cardio

**Additional Options:**
- PT check-ins (Yes/No)
- Equipment access (if Strength selected)
- Cardio class frequency (if Cardio selected)

---

## Athlete Scoring Algorithm

The system calculates 5 key scores (0-100 scale) to understand the athlete's current fitness:

### 1. Running Score
**Weighted Components:**
- 5km time (40% weight) - heavily influences score
- 10km time (40% weight) - heavily influences score
- Weekly volume (10% weight)
- Interval training (5% weight)
- Hill training (5% weight)

**Scoring Bands:**
- 80-100: Advanced runner
- 60-79: Intermediate runner
- 40-59: Developing runner
- <40: Beginner runner

### 2. Strength Score
**Based on 5RM lifts relative to bodyweight:**
- Bench Press
- Back Squat
- Deadlift
- Overhead Press

**Scoring:**
- First 2 weight options = Beginner (0-40)
- Middle weight options = Intermediate (40-70)
- Last 2 weight options = Advanced (70-100)

### 3. Cardio Conditioning Score
**Components:**
- Session frequency (50%)
- Session duration (30%)
- Interval/Zone 2 training (10%)
- Modality variety (10%)

### 4. Mobility & Recovery Score
**Based on:**
- Mobility work frequency
- Yoga practice
- Overall recovery habits

### 5. Competition Experience Score
**Scoring:**
- No experience: 0
- Once: 40
- 2-3 times: 70
- 4+ times: 90
- Bonus: +10 for Finished, +20 for Podium

### Overall Readiness Score
Weighted average:
- Strength: 25%
- Endurance (Running + Cardio): 35%
- Cardio Conditioning: 30%
- Mobility & Recovery: 10%
- Competition bonus applied

**Focus Area Recommendations:**
- Any score <60 → Automatically pre-selected as focus area
- Athletes can override recommendations

---

## Training Phase Determination

Based on **weeks to event**, the system assigns a training phase:

| Weeks to Event | Phase | Focus |
|----------------|-------|-------|
| >8 weeks | **Base** | Aerobic foundation, movement quality, technique |
| 4-8 weeks | **Build** | Volume increase, strength development, threshold work |
| ≤4 weeks | **Race Prep** | Race-specific intensity, simulation work, taper |
| No event | **Base** | General fitness development |

---

## Programme Generation Algorithm

### Step 1: Smart Session Distribution

The system uses **intelligent session distribution** to prevent overcrowding the training week:

**Smart Distribution Logic:**

1. **Calculate Total Requested Sessions:**
   - Running sessions (from user preference: 0-5)
   - Strength sessions (2 if Strength focus selected)
   - Cardio sessions (from onboarding: 0-5+)

2. **Hybrid Training Optimization:**
   - If BOTH Cardio + Strength are selected:
     - **Embed 2 cardio finishers** (15min) into strength days
     - Only count **standalone cardio** sessions toward training days
     - Formula: `Total = Runs + (Cardio - 2) + Strength`
   - If only Cardio (no Strength):
     - All cardio sessions are standalone
     - Formula: `Total = Runs + Cardio`

3. **Auto-Adjustment:**
   - If `Total > Training Days Per Week`:
     - **Reduce runs first** to fit schedule
     - Preserve cardio and strength sessions
     - Example: 5 runs + 2 cardio + 2 strength = 9 sessions → Reduce to 4 runs

**Example (6 training days, 5 runs, 2 cardio, 2 strength):**
```
Requested: 5 runs + 2 cardio + 2 strength = 9 sessions
Cardio embedded: 2 (in strength days as finishers)
Standalone cardio: 0 (2 - 2 = 0)
Total sessions: 5 runs + 0 standalone cardio + 2 strength = 7
Excess: 7 - 6 = 1
Adjusted: 4 runs + 2 strength (with cardio finishers) = 6 sessions ✅
```

**Smart Day Selection:**
- Each session type has **preferred days** (e.g., Long Run → Saturday)
- System checks for conflicts and finds next available day
- Ensures proper spacing between hard sessions
- Respects total training days per week

### Step 2: Running Programme

**1 Run per Week:**
- Saturday: **Long Run** (6-12km depending on phase)
  - Base: 6-8km
  - Build: 8-10km
  - Race Prep: 10-12km
  - Pace: Zone 2 (conversational)
  - Effort: Easy

**2 Runs per Week:**
- Add Tuesday: **Intervals**
  - Base: 6×500m
  - Build: 8×500m
  - Race Prep: 6×1km
  - Pace: Race pace
  - Effort: Hard
  - Rest: 90sec between reps

**3 Runs per Week:**
- Add Thursday: **Tempo Run**
  - Base: 4km
  - Build: 5-6km
  - Race Prep: 6km
  - Pace: Zone 3 (steady/threshold)
  - Effort: Moderate

**4 Runs per Week** (if Hills = Yes):
- Add Monday: **Hill Repeats**
  - 6×200m uphill
  - Pace: Hard effort
  - Effort: Hard
  - Focus: Power and form

**5 Runs per Week:**
- Add Wednesday: **Recovery Run**
  - 3-4km
  - Pace: Zone 1 (very easy)
  - Effort: Easy
  - Purpose: Active recovery, adaptation

### Step 3: Strength Programme

**If Strength is a Focus Area:**

**Hybrid Training (Cardio + Strength Focus):**
- **2 Strength Sessions with Embedded Cardio Finishers:**
  
  **Session 1: Strength Lower + Cardio Finisher**
  - Back squats, Bulgarian split squats, RDLs, leg press
  - + **15min cardio finisher** (SkiErg, RowErg, or circuit)
  - Effort: Hard
  
  **Session 2: Strength Upper + Cardio Finisher**
  - Bench press, strict press, weighted pull-ups, rows
  - + **15min cardio finisher** (SkiErg, RowErg, or circuit)
  - Effort: Hard

**Strength-Only Training (No Cardio Focus):**
- **2 Strength Sessions without Cardio:**
  
  **Session 1: Strength Lower**
  - Back squats, Bulgarian split squats, RDLs, leg press
  - Effort: Hard
  
  **Session 2: Strength Upper**
  - Bench press, strict press, weighted pull-ups, rows
  - Effort: Hard

**Note:** The system automatically adds cardio finishers when both Cardio and Strength are selected as focus areas. This provides additional cardio volume without requiring extra training days.

### Step 4: Cardio/Conditioning Programme

**If Cardio is a Focus Area:**

The system uses a **hybrid approach** combining embedded and standalone cardio sessions:

**Embedded Cardio (if Strength also selected):**
- **2× 15min cardio finishers** added to strength days
- Counts toward total cardio volume
- Examples: SkiErg intervals, RowErg threshold, bodyweight circuits
- Based on available equipment from onboarding

**Standalone Cardio Sessions:**
- Only scheduled if requested cardio > 2 sessions
- OR if Cardio selected without Strength focus
- Uses smart workout selector with 12 workout types:
  - **Equipment-based** (10 workouts): Ski-Row Threshold, Machine Endurance, Functional Engine, Machine Power, Sled-Ski Combo, Descending Ladder, Assault Gauntlet, Hybrid Pyramid, Lactic Threshold, HYROX Finisher
  - **Bodyweight** (2 workouts): Bodyweight Grinder, Bodyweight Power Intervals

**Workout Selection Logic:**
- Based on user's available equipment (SkiErg, RowErg, Sled, etc.)
- Rotates through different workout types each block
- Progressive overload every 2 blocks (4 weeks)
- Intensity varies: aerobic, threshold, power, race-sim

**Example Cardio Distribution:**

**Scenario 1: 2 Cardio Sessions + Strength Focus**
```
Day 1: Strength Lower + 15min Cardio Finisher (embedded)
Day 3: Strength Upper + 15min Cardio Finisher (embedded)
Total: 2 cardio sessions (both embedded, 0 standalone)
```

**Scenario 2: 4 Cardio Sessions + Strength Focus**
```
Day 1: Strength Lower + 15min Cardio Finisher (embedded)
Day 3: Strength Upper + 15min Cardio Finisher (embedded)
Day 4: Ski-Row Threshold (standalone, 40min)
Day 6: Machine Endurance Builder (standalone, 40min)
Total: 4 cardio sessions (2 embedded + 2 standalone)
```

**Scenario 3: 2 Cardio Sessions + NO Strength Focus**
```
Day 2: Ski-Row Threshold (standalone, 40min)
Day 5: Functional Engine AMRAP (standalone, 30min)
Total: 2 cardio sessions (both standalone)
```

### Step 5: Recovery/Mobility

**If Training Days Remaining:**
- **Active Recovery**
  - 20-30min yoga, foam rolling, dynamic stretching
  - Effort: Easy

---

## 2-Week Block Structure

### Week 1: Foundation
- Establish training rhythm
- Introduce volume/intensity
- Build movement patterns

### Week 2: Progressive Overload

**Strength Training:**
- **Main Work Sets**: +2 reps (e.g., 4×6 → 4×8)
- **Warm-up Sets**: NO CHANGE (stay at 10 reps for consistency)
- **Timed Exercises** (Plank/Holds): +15 seconds (capped at 2 minutes)
- **Weight**: Same as Week 1 (weight increases in Block 2)

**Running:**
- **Intervals**: SAME rounds (e.g., 6×500m stays 6×500m)
  - Progression via RPE: 8/10 effort naturally gets faster
  - Respects time constraints
- **Long Run**: +1km distance
- **Tempo Run**: +1km distance
- **Hill Repeats**: +2 reps

**Cardio/Conditioning:**
- **Circuits**: +1 round
- **Erg Workouts**: +100-200m distance

**Recovery/Mobility:**
- **NO PROGRESSION**: Same duration and exercises
- Purpose: Recovery, not adaptation

**Progressive Overload Principles:**
- Systematic, predictable progression
- Respects time constraints (no +2 intervals)
- RPE-based for running (8/10 effort improves naturally)
- Warm-ups don't progress (saves time/energy)
- Plank capped at 2 min (diminishing returns beyond this)

---

## Example Programme Outputs

### Example 1: Beginner Runner
**Profile:**
- 3 days/week
- 2 runs/week
- Running focus only
- No event
- Base phase

**Generated Programme:**

**Week 1:**
- Tuesday: Intervals (6×500m @ race pace)
- Saturday: Long Run (6-8km @ Z2)
- Sunday: Active Recovery (yoga/stretching)

**Week 2:**
- Tuesday: Intervals (6×500m @ race pace) ← SAME rounds, but faster at RPE 8/10
- Saturday: Long Run (7km @ Z2) ← +1km
- Sunday: Active Recovery ← NO CHANGE

---

### Example 2: Intermediate Hybrid Athlete
**Profile:**
- 6 days/week
- 5 runs/week requested
- Running + Strength + Cardio focus (all 3!)
- 2 cardio sessions from onboarding
- 6 weeks to event
- Build phase

**Smart Distribution:**
- Requested: 5 runs + 2 cardio + 2 strength = 9 sessions
- Cardio embedded: 2 (in strength days)
- Standalone cardio: 0
- Total: 5 runs + 2 strength = 7 sessions
- Excess: 7 - 6 = 1
- **Adjusted: 4 runs + 2 strength (with cardio finishers) = 6 sessions**

**Generated Programme:**

**Week 1:**
- Monday: Strength Lower + 15min Cardio Finisher (SkiErg intervals)
- Tuesday: Intervals (8×500m @ race pace)
- Wednesday: Strength Upper + 15min Cardio Finisher (RowErg threshold)
- Thursday: Tempo Run (5km @ Z3)
- Friday: Recovery Run (3-4km @ Z1)
- Saturday: Long Run (8km @ Z2)

**Week 2:**
- Monday: Strength Lower + 15min Cardio Finisher ← +2 reps on all main sets
- Tuesday: Intervals (8×500m @ race pace) ← SAME rounds, RPE 8/10
- Wednesday: Strength Upper + 15min Cardio Finisher ← +2 reps on all main sets
- Thursday: Tempo Run (6km @ Z3) ← +1km
- Friday: Recovery Run (3-4km @ Z1) ← NO CHANGE
- Saturday: Long Run (9km @ Z2) ← +1km

**Total Weekly Volume:**
- 4 running sessions (reduced from 5 to fit schedule)
- 2 strength sessions with embedded cardio finishers
- **= 6 training days with balanced hybrid training**

---

### Example 3: Advanced Multi-Sport Athlete
**Profile:**
- 6 days/week
- 4 runs/week (with hills)
- All 3 focus areas
- 3 weeks to event
- Race Prep phase

**Generated Programme:**

**Week 1:**
- Monday: Hill Repeats (6×200m)
- Tuesday: Intervals (6×1km @ race pace)
- Wednesday: Recovery Run (3-4km @ Z1)
- Thursday: Tempo Run (6km @ Z3) + Strength Upper
- Friday: Race Simulation (4 rounds hybrid)
- Saturday: Long Run (10-12km @ Z2)

**Week 2:**
- Monday: Hill Repeats (8×200m) ← +2 reps
- Tuesday: Intervals (6×1km @ race pace) ← SAME rounds, RPE 8/10
- Wednesday: Recovery Run (3-4km @ Z1) ← NO CHANGE
- Thursday: Tempo Run (7km @ Z3) + Strength Upper ← +1km, +2 reps on strength
- Friday: Race Simulation (4 rounds hybrid) ← +1 round
- Saturday: Long Run (11km @ Z2) ← +1km

---

## Key Training Principles Applied

### 1. Progressive Overload
- Gradual increase in volume/intensity
- Week 2 builds on Week 1
- Prevents plateaus and overtraining

### 2. Specificity
- Training matches race demands
- Focus areas get priority
- Session types align with goals

### 3. Recovery
- 7-9 hours sleep recommended
- Active recovery sessions included
- Proper spacing between hard sessions
- 3-5 days for supercompensation

### 4. Consistency
- Sustainable training frequency
- Balanced weekly structure
- Rest days strategically placed

### 5. Concurrent Training
- Strength and endurance combined intelligently
- 6+ hours separation when possible
- Prevents interference effect

---

## Energy System Training

### Phosphocreatine System (0-10 seconds)
- Hill repeats
- Sled pushes
- Explosive movements
- **Contribution: 15%**

### Glycolytic System (10 seconds - 2 minutes)
- Interval sessions
- Station work
- SkiErg/RowErg efforts
- **Contribution: 35%**

### Oxidative System (2+ minutes)
- Long runs
- Tempo runs
- Zone 2 work
- **Contribution: 50%**

---

## 80/20 Training Rule

**Research-backed intensity distribution:**
- **80% Low Intensity** (Zone 1-2): Aerobic base, recovery
- **20% High Intensity** (Zone 4-5): Race pace, power

**Avoid the "Gray Zone" (70-80% HR):**
- Compromises both aerobic base and high-end power
- Leads to chronic fatigue
- Reduces adaptation

---

## Monitoring & Adjustments

### After Each 2-Week Block:
1. Review athlete feedback
2. Check completion rates
3. Assess recovery quality
4. Adjust volume/intensity for next block
5. Modify focus areas if needed

### Red Flags:
- Persistent fatigue
- Declining performance
- Poor sleep quality
- Elevated resting HR
- Loss of motivation

### Adjustments:
- Reduce volume by 10-20%
- Add extra recovery day
- Lower intensity temporarily
- Focus on sleep/nutrition

---

## Technical Notes

### Data Storage Architecture

The system uses a **hybrid storage approach** combining local device storage and cloud database:

#### Local Storage (Device - No Internet Required)
**Location:** Browser/App Local Storage  
**Purpose:** Immediate access, offline functionality  
**Stores:**
- `onboarding_profile` - Complete athlete profile including:
  - All assessment answers (strength, running, cardio, etc.)
  - Calculated scores (running, strength, cardio, mobility, competition)
  - Training preferences (days/week, focus areas, runs/week)
- `current_programme` - Active 2-week training block including:
  - All sessions (day, type, title, distance, pace, effort, detail)
  - User preferences used for generation
  - Block number (1, 2, 3...)
  - Training phase (base/build/race-prep)
  - Generated timestamp
- `health_connected` - Health Connect sync status
- `strava_connected` - Strava sync status

**Advantages:**
- ✅ Works offline (no WiFi/5G needed)
- ✅ Instant access to programme
- ✅ Fast app performance
- ✅ No data charges

**Limitations:**
- ⚠️ Only available on current device
- ⚠️ Lost if app data cleared
- ⚠️ Not accessible to PT/coach

---

#### Cloud Storage (Supabase - Requires Internet)
**Location:** PostgreSQL database (Supabase)  
**Purpose:** Data backup, PT access, cross-device sync  
**Requires:** WiFi or 5G connection  
**Stores:**

**Table: `clients`**
- `id` - Unique client identifier
- `email` - Login email
- `name` - Full name
- `sex` - Biological sex (from onboarding)
- `age` - Age in years (from onboarding)
- `onboarding_completed_at` - Timestamp of completion
- `onboarding_profile` - **JSONB column** containing:
  - All answers from assessment
  - All calculated scores
  - Training preferences
  - Complete athlete profile

**When Data Syncs to Cloud:**
1. **During Onboarding** - When athlete completes questionnaire
2. **Programme Customization** - When preferences are saved
3. **Manual Sync** - If athlete triggers sync (future feature)

**Advantages:**
- ✅ PT/coach can view athlete data
- ✅ Data backed up safely
- ✅ Can access from multiple devices
- ✅ Training history preserved

**Limitations:**
- ⚠️ Requires internet connection (WiFi or 5G)
- ⚠️ Slight delay during sync
- ⚠️ Uses mobile data if not on WiFi

---

### Data Flow Example

**Scenario: New Athlete Onboarding**

1. **Athlete completes questionnaire** (offline capable)
   - Data saved to Local Storage immediately
   
2. **Athlete hits "Complete"** (requires internet)
   - System attempts to sync to Supabase
   - If no internet: Shows warning, data stays local
   - If internet available: Syncs to cloud, shows success
   
3. **Programme generation** (offline capable)
   - Reads from Local Storage
   - Generates 2-week block
   - Saves to Local Storage
   - No internet required
   
4. **Athlete views programme** (offline capable)
   - Reads from Local Storage
   - Displays 14-day schedule
   - Works without internet

**Scenario: PT Reviews Athlete**

1. **PT logs into admin panel** (requires internet)
   - Connects to Supabase
   - Queries `clients` table
   
2. **PT views athlete profile** (requires internet)
   - Reads `onboarding_profile` JSONB
   - Sees all scores and answers
   - Can review training preferences

---

### Programme Updates

**Automatic Updates (Future Feature):**
- New 2-week block generated every 14 days
- Uses latest athlete data from Local Storage
- Adapts to changing event timeline
- Progressive overload applied automatically

**Manual Updates:**
- Athlete can regenerate programme anytime
- Uses current preferences and scores
- Recalculates phase based on weeks to event
- Maintains training history

**Update Triggers:**
1. Every 14 days (automatic)
2. Athlete changes preferences
3. Athlete updates assessment scores
4. Event date changes (phase adjustment)

---

### Offline vs Online Capabilities

| Feature | Offline (No Internet) | Online (WiFi/5G) |
|---------|----------------------|------------------|
| View programme | ✅ Yes | ✅ Yes |
| Complete onboarding | ✅ Yes | ✅ Yes (with sync) |
| Generate programme | ✅ Yes | ✅ Yes |
| Sync to cloud | ❌ No | ✅ Yes |
| PT access | ❌ No | ✅ Yes |
| Cross-device access | ❌ No | ✅ Yes |
| Strava sync | ❌ No | ✅ Yes |
| Health Connect | ✅ Yes (local) | ✅ Yes |

---

### Data Persistence & Backup

**What happens if...**

**Athlete clears app data?**
- ❌ Local Storage cleared
- ✅ Cloud data preserved (if previously synced)
- Solution: Re-sync from cloud on next login

**Athlete switches devices?**
- ❌ Local Storage not transferred
- ✅ Cloud data available
- Solution: Login on new device, data syncs down

**No internet for extended period?**
- ✅ Programme continues to work
- ✅ Can train offline
- ⚠️ Changes not backed up to cloud
- Solution: Sync when internet available

**PT needs to review athlete?**
- ✅ Can access if athlete synced
- ❌ Cannot access if athlete never synced
- Solution: Athlete must complete onboarding with internet

---

### Recommendations for Athletes

**Best Practice:**
1. Complete onboarding with WiFi/5G connection
2. Allow initial sync to complete
3. Programme will work offline after that
4. Sync periodically when on WiFi (future feature)

**For Traveling Athletes:**
- Download programme before travel
- Works fully offline during trip
- Sync updates when back on WiFi

**For Data-Conscious Athletes:**
- Complete onboarding on WiFi (one-time)
- Use programme offline (no data usage)
- Sync on WiFi only (disable mobile data for app)

---

## Advanced Programming Features

### Deload Weeks (After 12 Weeks)

**Trigger:** After Block 6 (12 weeks of training)

**Purpose:** 
- Reduce accumulated fatigue
- Allow supercompensation
- Prevent overtraining
- Maintain fitness while recovering

**Implementation:**
- Reduce volume by 30%
- Maintain intensity (same weights/paces)
- Reduce sets by 1 (e.g., 4 sets → 3 sets)
- Keep reps the same
- Reduce running volume by 30% (e.g., 8km → 6km)
- No max efforts or testing

**Example Deload Week:**
```
Normal Week:
- Goblet Squat 4×8 @ 55kg
- Long Run 8km

Deload Week:
- Goblet Squat 3×8 @ 55kg ← One less set
- Long Run 6km ← 30% less distance
```

**Note:** Serious long-distance runners may need deloads every 3-5 weeks (PT discretion).

---

### Taper Protocol (2 Weeks Before Event)

**Trigger:** When event date is ≤14 days away

**Purpose:**
- Reduce fatigue while maintaining fitness
- Peak for race day
- Minimize injury risk
- Sharpen neuromuscular coordination

**Week -2 (14-8 days before event):**
- Reduce volume by 20%
- Keep 1-2 quality sessions (short, sharp)
- Replace high-impact runs with low-impact alternatives (rower, ski erg, bike)
- Reduce strength sets by 1
- No new exercises or heavy lifts

**Week -1 (7-1 days before event):**
- Reduce volume by 40%
- Only 1 quality session (early in week)
- Mostly low-impact cardio
- Light strength maintenance (2×8 instead of 4×8)
- Short shakeout runs (2-3km) to maintain feel
- Emphasize sleep and nutrition

**Example Taper:**
```
Normal Week:
- Intervals 6×500m
- Long Run 8km
- Strength 4×8

Taper Week -2:
- Intervals 4×500m ← Reduced volume
- Long Run 6km (or 30min bike) ← Low impact
- Strength 3×8 ← One less set

Taper Week -1:
- Easy 3km shakeout
- 20min bike Z2
- Strength 2×8 ← Light maintenance
```

---

### Session Spacing Logic

**Purpose:** Optimize recovery and prevent overtraining

**Rules:**

1. **After Hard Lower Body (RPE 8+):**
   - Next day: Upper body OR Zone 2 cardio
   - Example: Squats Monday → Bench Press Tuesday OR Easy bike

2. **After Hard Upper Body (RPE 8+):**
   - Next day: Lower body OR Zone 2 cardio
   - Example: Bench Press Tuesday → Tempo Run Wednesday OR Easy row

3. **After HIIT/Intervals (RPE 9+):**
   - Next day: Easy/Recovery session
   - Example: Intervals Tuesday → Recovery Run Wednesday

4. **No Back-to-Back RPE 9+ Days:**
   - Minimum 48 hours between max effort sessions
   - Example: HYROX Sim Friday → Rest/Easy Saturday → Strength Sunday

**Intensity Scale (RPE 1-10):**
- 1-3: Easy (recovery, Zone 2)
- 4-6: Moderate (tempo, hypertrophy)
- 7-8: Hard (heavy strength, intervals)
- 9-10: Very Hard (max effort, race simulation)

---

### Double-Day Sessions (Advanced)

**Eligibility:** Athletes training 4+ days per week

**Purpose:**
- Increase training volume without adding days
- Separate strength and cardio for better adaptation
- Maximize training stimulus

**Implementation:**
- Maximum 2 double-day sessions per week
- Separate sessions by 6+ hours
- AM: Zone 2 cardio (30 min, low intensity)
- PM: Strength or HIIT (45-60 min)

**Example Double-Day:**
```
Tuesday:
- AM (7:00): 30min Zone 2 bike
- PM (18:00): Strength Lower + Easy Engine (60min)

Thursday:
- AM (7:00): 30min Zone 2 row
- PM (18:00): Intervals 6×500m (45min total)
```

**Considerations:**
- Time constraints (biggest limitation)
- Recovery capacity
- Nutrition timing (fuel both sessions)
- Sleep quality (7-9 hours minimum)

---

### PT Check-In Points

**Purpose:** Manual adjustments that algorithms cannot make

**Every 2 Weeks (After Each Block):**
1. Review athlete feedback
2. Check completion rates
3. Assess recovery quality (sleep, soreness, motivation)
4. Adjust volume/intensity for next block
5. Modify focus areas if needed

**Red Flags Requiring PT Intervention:**
- Persistent fatigue (not resolved by rest day)
- Declining performance (slower times, lower weights)
- Poor sleep quality (< 6 hours, frequent waking)
- Elevated resting HR (>10 bpm above baseline)
- Loss of motivation or enjoyment
- Recurring injuries or pain

**PT Adjustments (Cannot Be Automated):**
- Trigger early deload (before 12 weeks)
- Adjust progression rate based on "feel"
- Modify exercises for injury management
- Change focus areas based on life stress
- Prescribe extra recovery based on subjective fatigue

**Why These Cannot Be Automated:**
> "Humans and situations have so many variables" - Age, experience, starting point, fatigue accumulation, life stress, sleep quality, nutrition, and "feel on the day" all require human judgment.

**Philosophy:**
- Use **simple, consistent rules** for 80% of athletes
- PT adjusts the other 20% in check-ins
- Better to be **predictable and adjustable** than "smart" and wrong

---

## Questions Answered (PT Feedback)

1. **Volume Progression**: ~~Is 10% increase appropriate for all athletes?~~
   - **Answer:** NO. Too many variables (age, experience, feel on the day). Use fixed progression rules (+2 reps, +15 sec, +1km) instead. PT adjusts in check-ins.

2. **Session Spacing**: ~~Should we enforce minimum rest between hard sessions?~~
   - **Answer:** YES. Alternate upper/lower, add Zone 2 after hard sessions, prevent back-to-back RPE 9+ days.

3. **Deload Weeks**: ~~Should we add a deload every 3-4 blocks?~~
   - **Answer:** YES, after 12 weeks (6 blocks). Reduce volume 30%. Runners may need every 3-5 weeks (PT discretion).

4. **Taper Protocol**: ~~How should we adjust final 2 weeks before event?~~
   - **Answer:** YES. Week -2: -20% volume. Week -1: -40% volume. Use low-impact machines, keep quality short.

5. **Beginner Modifications**: ~~Should we cap volume for athletes with low scores?~~
   - **Answer:** NO! Beginners might need MORE volume to progress. Use conservative starting weights, PT adjusts.

6. **Advanced Options**: ~~Should we add double-day sessions for 6-day athletes?~~
   - **Answer:** YES, for 4+ day athletes. Max 2 double-days/week. AM cardio + PM strength. Time constraints biggest issue.

---

## Glossary

- **Z1/Z2/Z3**: Heart rate zones (1=easy, 2=moderate, 3=threshold)
- **EMOM**: Every Minute On the Minute (interval format)
- **5RM**: 5 Rep Max (heaviest weight for 5 reps)
- **Tempo**: Sustained effort at threshold pace
- **Engine Work**: Mixed-modality conditioning
- **Supercompensation**: Adaptation period after training stress (3-5 days)
- **Concurrent Training**: Combining strength and endurance in same programme
- **Progressive Overload**: Gradual increase in training stress over time

---

**Document Version**: 1.0  
**Last Updated**: November 2025  
**For Questions**: Contact development team

