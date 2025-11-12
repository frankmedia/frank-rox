# Strength Workout Finishers

## Overview
All strength workouts now include a **4-minute high-intensity finisher** at the end, before the cool-down. This adds metabolic conditioning and ensures maximum calorie burn.

## Finisher Rotation
The system automatically rotates through 3 finisher types based on the day index:
- **Day 1, 4, 7, 10, 13**: Finisher #1
- **Day 2, 5, 8, 11, 14**: Finisher #2
- **Day 3, 6, 9, 12**: Finisher #3

---

## Finisher #1: 4 Min AMRAP
**Format**: As Many Rounds As Possible in 4 minutes

**Exercises**:
1. 10 Burpee Box Jumps
2. 100m SkiErg

**Notes**:
- Step down from box (don't jump down)
- SkiErg: Fast and aggressive - full send
- Record total rounds completed

**Example**: If you complete 5 rounds, you did 50 burpee box jumps and 500m on the SkiErg in 4 minutes.

---

## Finisher #2: Max Effort in 1 Minute
**Format**: 4 rounds of 1 minute work, 1 minute rest

**Variants** (alternates randomly):

### Variant A: Max Cals on Erg
- Choose one machine (rotates between SkiErg, RowErg, Assault Bike)
- Go all out for 1 minute
- Record calories each round
- Rest 1 minute between rounds

### Variant B: Max Burpees
- Max reps in 1 minute
- Chest to floor, full jump
- Record reps each round
- Rest 1 minute between rounds

**Notes**:
- This is a max effort test - go ALL OUT
- Track your scores to measure progress over weeks

---

## Finisher #3: 4 Min Circuit
**Format**: 2 rounds of a 4-exercise circuit (30 seconds each exercise)

**Exercises** (2 rounds):
1. 30sec Burpees (max effort)
2. 30sec Star Jumps (explosive)
3. 30sec Lunge Jumps (alternating legs)
4. 30sec Press Ups (chest to floor)

**Notes**:
- No rest between exercises or rounds
- Continuous movement for full 4 minutes
- Focus on maintaining intensity throughout

---

## Training Benefits

### Metabolic Conditioning
- Increases calorie burn post-workout (EPOC effect)
- Improves cardiovascular fitness
- Builds work capacity

### Time Efficiency
- Adds only 4 minutes to workout
- High return on time investment
- Complements strength work without interfering with recovery

### Progressive Overload
- Track rounds/reps/calories each week
- Clear measurable progress
- Builds mental toughness

---

## Implementation Details

### Workout Structure
```
1. Warm-up (5 min)
2. Main Strength Work (40-50 min)
3. 4-Minute Finisher ← NEW
4. Cool-down (5 min)
```

### Database Integration
- Finishers are automatically added to all strength sessions
- Uses `session_blocks` with appropriate `block_type`:
  - Finisher #1: `amrap`
  - Finisher #2: `amrap` (max effort variant)
  - Finisher #3: `circuit`

### Rotation Logic
```typescript
function getFinisherRotation(dayIndex: number): number {
  return ((dayIndex - 1) % 3) + 1;
}
```

---

## User Experience

### In the App
- Finishers appear as a separate block after strength exercises
- Clear timing and format instructions
- Exercises display with appropriate icons (AMRAP/Circuit)
- Users can log performance (rounds, reps, calories)

### Progression Tracking
Users can track:
- **Finisher #1**: Total rounds completed
- **Finisher #2 (Erg)**: Calories per round (4 data points)
- **Finisher #2 (Burpees)**: Reps per round (4 data points)
- **Finisher #3**: Completion (yes/no) + perceived difficulty

---

## Exercise Requirements

The following exercises must exist in the `exercises` table for finishers to work:

### Required:
- **Burpee** or **Burpees**
- **SkiErg** (ID: `917c05c6-5adf-4d3b-887e-ff2a292fa079`)

### Recommended:
- **Burpee Box Jump** / **Box Jump Burpee**
- **Star Jump** / **Jumping Jack**
- **Lunge Jump** / **Jumping Lunge**
- **Press Up** / **Push Up**
- **RowErg** (ID: `d8f8bf07-c315-40a4-ae0c-b3fcb4db74e2`)
- **Assault Bike** / **Air Bike**

If an exercise is missing, the finisher will log a warning and skip that movement.

---

## Future Enhancements

Potential additions:
- [ ] User preference to enable/disable finishers
- [ ] Additional finisher variations (e.g., sled push, kettlebell swings)
- [ ] Performance analytics dashboard for finisher progress
- [ ] Adaptive finisher difficulty based on user level
- [ ] Finisher leaderboards

---

**Created**: 2025-11-12  
**Status**: ✅ Live in production

