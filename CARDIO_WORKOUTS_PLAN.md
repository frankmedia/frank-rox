# New Cardio Workout System

## 10 Hyrox-Style Cardio Workouts (No Running)

### Weekly Programming Strategy:
- **2x Aerobic Builders** (Workouts 1 & 8) - Zone 2-3, steady state
- **2x Threshold / Power** (Workouts 2 & 9) - Hard efforts, lactate tolerance
- **1x Race Simulation** (Workout 10) - Full Hyrox-style finisher
- **1x Recovery Flow** (light machine mix or walk)

### Workout Types:

1. **Machine Endurance Builder** (40min Z2-3) - AEROBIC
2. **Ski-Row Threshold** (4 rounds: 1000m Ski + 1000m Row + 20 Wall Balls) - THRESHOLD
3. **Functional Engine AMRAP** (30min: Row, Lunges, Burpees, KB, Wall Balls) - MIXED
4. **Machine Power Intervals** (6 rounds: 1min Ski/Row/Bike hard + 1min rest) - POWER
5. **Sled & Ski Combo** (5 rounds: 250m Ski + Sled Push/Pull + Air Squats) - POWER
6. **Descending Ladder** (10-8-6-4-2: 250m Ski/Row + 10 Burpees) - MIXED
7. **Assault Gauntlet** (EMOM 5min x6: 20cal Bike + Jump Squats + KB DL) - POWER
8. **Hybrid Pyramid** (250-500-750-1000-750-500-250 Ski/Row/Bike) - AEROBIC
9. **Lactic Threshold Builder** (3 rounds: 500m Row + Burpees + 250m Ski + KB) - THRESHOLD
10. **Full Hyrox Finisher** (4 rounds: 1000m Ski + Wall Balls + Burpees + Sled) - RACE SIM

### Implementation Plan:
1. ✅ Update CardioSessionOptions interface with 10 new types
2. ✅ Update createCardioSession switch statement
3. ⏳ Implement all 10 workout builder functions
4. ⏳ Update ProgrammeBuilder to use new workout types
5. ⏳ Update programmeToDatabase to map titles to new types

