# Google Sheets Exercise Parsing Rules

This document outlines how exercises are parsed from Google Sheets to ensure the Supabase version replicates the exact same behavior.

## Sheet Column Structure
```
[Day, Name, Type, Sets, Reps, Kg, PB, Duration, Distance, Notes, MediaUrl]
```

## Exercise Types & Parsing Rules

### 1. **INTRO** (`type: "intro"`)
- **Purpose**: Informational card (warm-up instructions, etc.)
- **Parsing**:
  - `isGroupHeader: false`
  - No workout parameters
  - Just displays name and notes

### 2. **CIRCUIT** (Group Header: `type: "circuit"`)
- **Sheet Format**:
  ```
  CIRCUIT: Name    circuit    3    -    -    -    -    90s rest    -    Notes
  ```
- **Parsing**:
  - `isGroupHeader: true`
  - `totalRounds = Sets column` (default: 3)
  - `notes = Duration column` (e.g., "90s rest") OR Notes column
  - Groups all following `circuit_exercise` rows as children

### 3. **CIRCUIT_EXERCISE** (Child of Circuit)
- **Sheet Format**:
  ```
  SkiErg    circuit_exercise    -    1    -    -    -    0.25    -    Notes
  ```
- **Parsing**:
  - `_isChildExercise: true`
  - `type: "weights"` (default, but can be inferred from modality)
  - `reps = Reps column`
  - `durationMin = Duration column` (if numeric)
  - `targetDistanceKm = Distance column`
  - Added to parent Circuit's `exercises` array

### 4. **AMRAP** (Group Header: `type: "amrap"`)
- **Sheet Format**:
  ```
  AMRAP: Name    amrap    -    -    -    -    -    12    -    Notes
  ```
- **Parsing**:
  - `isGroupHeader: true`
  - `timeCap = Duration column` (in minutes, default: 10)
  - Groups all following `amrap_exercise` rows as children

### 5. **AMRAP_EXERCISE** (Child of AMRAP)
- **Sheet Format**:
  ```
  Burpees    amrap_exercise    -    10    -    -    -    -    -    Notes
  ```
- **Parsing**:
  - `_isChildExercise: true`
  - `type: "bodyweight"` (default)
  - `reps = Reps column`
  - Added to parent AMRAP's `exercises` array

### 6. **HIIT** (Standalone: `type: "hiit"`)
- **Sheet Format**:
  ```
  Row Erg Sprint    hiit    6    -    -    -    -    30/60    -    Notes
  ```
- **Parsing**:
  - `isGroupHeader: false` (NOT a group!)
  - `totalRounds = Sets column` (default: 8)
  - `workRestRatio = Duration column` (e.g., "30/60" = 30s work / 60s rest)
  - If Duration doesn't contain "/", use Notes column for ratio
  - **Key**: HIIT is a single exercise, not a group with children

### 7. **CARDIO** (`type: "cardio"`)
- **Sheet Format**:
  ```
  Treadmill Run    cardio    -    -    -    PB    30    5    Notes
  ```
- **Parsing**:
  - `durationMin = Duration column`
  - `targetDistanceKm = Distance column`
  - `personalBest = PB column`

### 8. **RUNNING** (`type: "running"`)
- **Sheet Format**:
  ```
  400m Sprint    running    -    -    -    PB    -    0.4    Notes
  ```
- **Parsing**:
  - `targetDistanceKm = Distance column`
  - `personalBest = PB column`

### 9. **MOBILITY** (`type: "mobility"`)
- **Sheet Format**:
  ```
  Hip Flexor Stretch    mobility    -    -    -    -    5    -    Notes
  ```
- **Parsing**:
  - `durationMin = Duration column`
  - No PB, no sets/reps/weight

### 10. **BODYWEIGHT** (`type: "bodyweight"`)
- **Sheet Format**:
  ```
  Push-Ups    bodyweight    3    15    -    PB    -    -    Notes
  ```
- **Parsing**:
  - `sets = Sets column` (default: 3)
  - `reps = Reps column` (default: 10)
  - `personalBest = PB column`
  - NO `suggestedKg`

### 11. **WEIGHTS** (`type: "weights"`, default)
- **Sheet Format**:
  ```
  Shoulder Press    weights    3    10    20    PB    -    -    Notes
  ```
- **Parsing**:
  - `sets = Sets column` (default: 3)
  - `reps = Reps column` (default: 10)
  - `suggestedKg = Kg column` (default: 0)
  - `personalBest = PB column`

## Grouping Logic (Second Pass)

After parsing all exercises, a second pass groups them:

1. When a **group header** is found (Circuit, AMRAP):
   - Start a new group
   - Collect all following exercises with `_isChildExercise: true`
   - Stop when a non-child exercise is found
   - Add children to header's `exercises` array

2. **Child detection**:
   - Exercise has `_isChildExercise: true`, OR
   - Exercise name starts with "→" or "- "

3. **Result**:
   - Group headers appear as single cards in the UI
   - Children are hidden from the main list
   - Clicking a group opens a specialized workout screen (CircuitWorkout, AMRAPWorkout)

## Key Differences: Supabase vs Sheets

### Supabase Structure
```
sessions → session_blocks → session_block_items → exercises
```

- **Format Groups**: Blocks with `parameters.format_group = true` or `parameters.format`
- **Block Parameters**: `rounds`, `time_cap`, `work`, `rest`, `notes`
- **Item Extra**: `sets`, `reps`, `weight`, `duration`, `distance`, `rest`, `tempo`

### Mapping Rules

| Sheets Column | Supabase Location | Notes |
|---------------|-------------------|-------|
| Sets | `item.extra.sets` | For regular exercises |
| Sets (Circuit) | `block.parameters.rounds` | For circuit header |
| Sets (HIIT) | `block.parameters.rounds` | For HIIT intervals |
| Reps | `item.extra.reps` | |
| Kg | `item.extra.weight` | |
| Duration | `item.extra.duration` | In minutes |
| Duration (AMRAP) | `block.parameters.time_cap` | For AMRAP header |
| Duration (HIIT) | `block.parameters.work` + `rest` | Split into work/rest |
| Distance | `item.extra.distance` | In km |
| Notes | `exercises.notes` OR `block.parameters.notes` | |
| Rest | `item.extra.rest` | In seconds |
| Tempo | `item.extra.tempo` | E.g., "3-1-1" |

## Implementation Checklist for Supabase

- [x] Detect format groups (Circuit, AMRAP, HIIT)
- [x] Create parent exercise for Circuit/AMRAP with children
- [x] Handle HIIT as standalone (not grouped)
- [ ] Parse child exercise parameters from `extra`
- [ ] Map block parameters to parent exercise fields
- [ ] Handle work/rest ratio for HIIT (from block params)
- [ ] Ensure `_isChildExercise` flag on children
- [ ] Test all exercise types render correctly in client app


