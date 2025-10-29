# Advanced Template System - Overview

## 🎯 Purpose

Build a **movement-based program design framework** that helps PTs create scientifically-sound workout plans following specific programming rules (movement patterns, set/rep schemes, split logic).

---

## 🗄️ Database Structure

### 1. **Updated: `exercises` table**
Added columns to classify exercises:
- `movement_pattern` - squat, hinge, push, pull, carry, thrust, abduction, isolation, etc.
- `plane_of_motion` - sagittal, frontal, transverse
- `primary_muscle_group` - glutes, quads, hamstrings, chest, back, shoulders, etc.
- `secondary_muscle_groups` - array of secondary muscles
- `equipment_category` - machine, barbell, dumbbell, kettlebell, bodyweight, cable
- `exercise_complexity` - beginner, intermediate, advanced

### 2. **New: `template_movement_requirements` table**
Defines WHAT movements are required and HOW MUCH:
```sql
- movement_pattern (squat, hinge, push, pull, etc.)
- frequency_per_week (how many times this movement appears)
- warmup_sets, warmup_reps
- working_sets, working_reps
- intensity_guideline (near_fatigue, RPE_8, etc.)
- priority_order (1 = first exercise, 2 = second, etc.)
- placement_rule (start_of_workout, mid_workout, end_of_workout)
- specific_muscle_focus (e.g., "glutes" for glute program)
```

### 3. **New: `template_workout_structures` table**
Defines workout day blueprints:
```sql
- workout_name ("Day 1: Full Body", "Upper Push", etc.)
- workout_type (full_body, upper_push, lower_squat, etc.)
- day_in_cycle (1-7)
- structure_data (JSONB) - the actual workout slots
```

Example `structure_data`:
```json
{
  "slots": [
    {
      "slot": 1,
      "movement": "squat",
      "sets": 4,
      "reps": 12,
      "warmup_sets": 2,
      "focus": "glutes"
    },
    {
      "slot": 2,
      "movement": "hinge",
      "sets": 4,
      "reps": 12,
      "warmup_sets": 2
    }
  ]
}
```

### 4. **New: `template_split_logic` table**
Defines the training split:
```sql
- split_type (full_body, upper_lower, push_pull_legs, custom)
- days_per_week
- weekly_structure (JSONB) - which workouts on which days
- progression_scheme (linear, wave, undulating)
- deload_frequency (every X weeks)
```

### 5. **New: `template_rules` table**
Validation rules for template-based plans:
```sql
- rule_type (movement_coverage, plane_coverage, frequency, volume)
- validation_logic (JSONB) - the actual validation criteria
- priority (required, recommended, optional)
- warning_message (shown to PT if rule violated)
```

---

## 📋 How It Works - Example: Glute Hypertrophy Program

### Template Definition:
```
Name: Glute Hypertrophy 3x/Week
Days: 3x per week
Focus: Glute specialization
```

### Movement Requirements (per workout):
1. **Squat** - 2x12 warmup, 4x12 working, near fatigue
2. **Hinge** - 2x12 warmup, 4x12 working, near fatigue
3. **Thrust** - 2x12 warmup, 4x12 working, near fatigue
4. **Abduction** - 2x12 warmup, 4x12 working, near fatigue
5. **Push** - 3x12 (light, for balance)
6. **Pull** - 3x12 (light, for balance)

### Validation Rules:
- ✅ Must include all 4 glute movements per workout
- ✅ Each glute movement: 2 warmup + 4 working sets
- ✅ Exactly 3 workouts per week with rest days

---

## 🔄 Workflow for PT

### Step 1: Create Template (One-time setup)
```
1. Admin creates "Glute Hypertrophy 3x/Week" template
2. Defines movement requirements (squat, hinge, thrust, abduction)
3. Sets set/rep schemes (2x12 warmup, 4x12 working)
4. Defines workout structures (3 sessions per week)
5. Adds validation rules
```

### Step 2: Create Plan from Template (For each client)
```
1. PT clicks "New Plan from Template" for client
2. Selects "Glute Hypertrophy 3x/Week" template
3. System generates empty workout structure following template rules
4. PT fills in exercises for each slot:
   
   Day 1:
   [Slot 1: Squat] → PT picks: "Goblet Squat" (2x12, 4x12)
   [Slot 2: Hinge] → PT picks: "RDL" (2x12, 4x12)
   [Slot 3: Thrust] → PT picks: "Hip Thrust" (2x12, 4x12)
   [Slot 4: Abduction] → PT picks: "Cable Abduction" (2x12, 4x12)
   [Slot 5: Push] → PT picks: "Chest Press" (3x12)
   [Slot 6: Pull] → PT picks: "Seated Row" (3x12)
   
   Day 3: [Same slots, different exercises]
   Day 5: [Same slots, different exercises]

5. System validates plan against template rules
6. Shows warnings if rules violated
7. PT publishes plan to client
```

### Step 3: Client Uses Plan
```
- Client sees their personalized plan
- All exercises follow the template structure
- Consistency across weeks
- PT can adjust individual exercises as needed
```

---

## 🎨 UI Components Needed

### 1. Template Creator/Editor
- Form to define movement requirements
- Workout structure builder
- Validation rule creator

### 2. Plan Builder with Template
- Slot-based exercise selection
- Shows movement pattern for each slot
- Real-time validation against template rules
- Exercise suggestions filtered by movement pattern

### 3. Template Library
- Browse templates by type
- Clone/edit templates
- See template details (movements, structure, rules)

---

## 🚀 Next Steps

### Phase 1: Database Setup ✅
- [x] Create migration file
- [ ] Run migration in Supabase
- [ ] Tag existing exercises with movement patterns

### Phase 2: Exercise Tagging
- [ ] Build UI to tag exercises with movement patterns
- [ ] Classify existing exercises (squat, hinge, push, pull, etc.)
- [ ] Add muscle groups and planes of motion

### Phase 3: Template Builder UI
- [ ] Movement requirements form
- [ ] Workout structure builder
- [ ] Validation rules creator

### Phase 4: Template-Based Plan Creator
- [ ] "Create from Template" flow
- [ ] Slot-based exercise picker
- [ ] Real-time validation
- [ ] Exercise filtering by movement pattern

### Phase 5: Advanced Features
- [ ] Auto-suggest exercises based on movement pattern
- [ ] Progress tracking per movement pattern
- [ ] Template marketplace/library
- [ ] AI-assisted exercise selection

---

## 💡 Example Templates You Can Create

1. **Full Body Beginner (3x/week)**
   - 1 squat, 1 hinge, 1 push, 1 pull per workout
   - 3x10 reps
   - Machine-based

2. **Upper/Lower Split (4x/week)**
   - Upper: 2 push, 2 pull
   - Lower: 2 squat, 2 hinge
   - 4x8 reps

3. **Glute Specialization (3x/week)**
   - As detailed above

4. **Hyrox Prep (6x/week)**
   - 3x strength (all patterns)
   - 3x endurance (running/erg)
   - Skill work (burpees, wall balls, etc.)

5. **Push/Pull/Legs (6x/week)**
   - Push: 4 push movements
   - Pull: 4 pull movements
   - Legs: 2 squat, 2 hinge

---

## 📊 Benefits

### For PT:
- ✅ Consistent program design framework
- ✅ Less mental overhead (template does the thinking)
- ✅ Quality control (validation rules prevent mistakes)
- ✅ Faster plan creation
- ✅ Reusable templates across clients

### For Clients:
- ✅ Well-structured programs
- ✅ Progressive overload
- ✅ Balanced training (all movement patterns covered)
- ✅ Professional-grade programming

---

## 🛠️ Technical Notes

- **Movement Pattern Taxonomy**: Based on biomechanics (squat, hinge, push, pull, carry, rotation, isolation)
- **Planes of Motion**: Sagittal (forward/back), Frontal (side), Transverse (rotation)
- **Flexibility**: Templates are guidelines, not rigid rules - PT can override as needed
- **Validation**: Warnings, not errors - PT has final say
- **Extensibility**: Easy to add new movement patterns, rules, or template types

