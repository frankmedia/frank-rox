/**
 * Cardio Workout Selection Algorithm
 * 
 * Selects appropriate cardio workouts based on:
 * - Equipment availability (hard constraint)
 * - Training phase and intensity
 * - Weekly rotation (no repeats in 2-week block)
 * - Progressive overload every 2 weeks
 */

export type CardioWorkoutType =
  | "machine-endurance"      // 40min steady state (Z2-3)
  | "ski-row-threshold"      // 4 rounds: 1000m Ski + 1000m Row + 20 Wall Balls
  | "functional-engine"      // 30min AMRAP: Row, Lunges, Burpees, KB, Wall Balls
  | "machine-power"          // 6 rounds: 1min Ski/Row/Bike (hard) + 1min rest
  | "sled-ski-combo"         // 5 rounds: 250m Ski + Sled Push/Pull + Air Squats
  | "descending-ladder"      // 10-8-6-4-2: 250m Ski/Row + 10 Burpees
  | "assault-gauntlet"       // EMOM 5min x6: 20cal Bike + Jump Squats + KB DL
  | "hybrid-pyramid"         // Pyramid: 250-500-750-1000-750-500-250 (Ski/Row/Bike)
  | "lactic-threshold"       // 3 rounds: 500m Row + Burpees + 250m Ski + KB Swings
  | "hyrox-finisher";        // 4 rounds: 1000m Ski + Wall Balls + Burpees + Sled

export interface CardioWorkoutDefinition {
  type: CardioWorkoutType;
  name: string;
  intensity: "easy" | "moderate" | "hard";
  category: "aerobic" | "threshold" | "power" | "race-sim" | "mixed";
  requiredEquipment: string[]; // Must have ALL of these
  optionalEquipment: string[]; // Nice to have but not required
  duration: number; // minutes
}

// All 10 cardio workouts with their requirements
export const CARDIO_WORKOUTS: CardioWorkoutDefinition[] = [
  {
    type: "machine-endurance",
    name: "Machine Endurance Builder",
    intensity: "easy",
    category: "aerobic",
    requiredEquipment: ["SkiErg", "RowErg"],
    optionalEquipment: ["Assault Bike"],
    duration: 40
  },
  {
    type: "ski-row-threshold",
    name: "Ski-Row Threshold",
    intensity: "hard",
    category: "threshold",
    requiredEquipment: ["SkiErg", "RowErg", "Wall balls"],
    optionalEquipment: [],
    duration: 35
  },
  {
    type: "functional-engine",
    name: "Functional Engine AMRAP",
    intensity: "moderate",
    category: "mixed",
    requiredEquipment: ["RowErg", "Wall balls"],
    optionalEquipment: ["Heavy dumbbells"],
    duration: 30
  },
  {
    type: "machine-power",
    name: "Machine Power Intervals",
    intensity: "hard",
    category: "power",
    requiredEquipment: ["SkiErg", "RowErg"],
    optionalEquipment: ["Assault Bike"],
    duration: 30
  },
  {
    type: "sled-ski-combo",
    name: "Sled & Ski Combo",
    intensity: "hard",
    category: "power",
    requiredEquipment: ["SkiErg", "Sled push/pull"],
    optionalEquipment: [],
    duration: 25
  },
  {
    type: "descending-ladder",
    name: "Descending Ladder",
    intensity: "moderate",
    category: "mixed",
    requiredEquipment: ["SkiErg", "RowErg"],
    optionalEquipment: [],
    duration: 25
  },
  {
    type: "assault-gauntlet",
    name: "Assault Gauntlet",
    intensity: "hard",
    category: "power",
    requiredEquipment: ["Assault Bike"],
    optionalEquipment: ["Heavy dumbbells"],
    duration: 30
  },
  {
    type: "hybrid-pyramid",
    name: "Hybrid Pyramid",
    intensity: "easy",
    category: "aerobic",
    requiredEquipment: ["SkiErg", "RowErg"],
    optionalEquipment: ["Assault Bike"],
    duration: 35
  },
  {
    type: "lactic-threshold",
    name: "Lactic Threshold Builder",
    intensity: "hard",
    category: "threshold",
    requiredEquipment: ["SkiErg", "RowErg"],
    optionalEquipment: ["Heavy dumbbells"],
    duration: 30
  },
  {
    type: "hyrox-finisher",
    name: "Full Hyrox Finisher",
    intensity: "hard",
    category: "race-sim",
    requiredEquipment: ["SkiErg", "Wall balls", "Sled push/pull"],
    optionalEquipment: [],
    duration: 40
  }
];

/**
 * Filter workouts by available equipment
 */
export function getAvailableWorkouts(userEquipment: string[]): CardioWorkoutDefinition[] {
  return CARDIO_WORKOUTS.filter(workout => {
    // User must have ALL required equipment
    return workout.requiredEquipment.every(req => 
      userEquipment.some(eq => eq.toLowerCase().includes(req.toLowerCase()))
    );
  });
}

/**
 * Select cardio workout for a specific day
 * 
 * @param blockNumber - Which 2-week block (1, 2, 3, etc.) for rotation
 * @param weekInBlock - Week 1 or 2 within the block
 * @param sessionNumber - Which cardio session this week (1st, 2nd, etc.)
 * @param userEquipment - Available equipment
 * @param trainingDays - Total training days per week
 * @returns Selected workout type and intensity modifier
 */
export function selectCardioWorkout(
  blockNumber: number,
  weekInBlock: 1 | 2,
  sessionNumber: number,
  userEquipment: string[],
  trainingDays: number
): { type: CardioWorkoutType; intensityModifier: number } {
  
  // Get workouts that match user's equipment
  const available = getAvailableWorkouts(userEquipment);
  
  if (available.length === 0) {
    // Fallback: bodyweight-only workout (descending-ladder with burpees)
    return { type: "descending-ladder", intensityModifier: 1.0 };
  }
  
  // Determine intensity preference based on session number and training days
  let preferredCategory: CardioWorkoutDefinition["category"];
  
  if (trainingDays <= 3) {
    // Low frequency: focus on aerobic base
    preferredCategory = "aerobic";
  } else if (sessionNumber === 1) {
    // First cardio session: threshold or power
    preferredCategory = weekInBlock === 1 ? "threshold" : "power";
  } else if (sessionNumber === 2) {
    // Second cardio session: aerobic or mixed
    preferredCategory = weekInBlock === 1 ? "aerobic" : "mixed";
  } else {
    // Third cardio session (5-6 days/week): race sim or power
    preferredCategory = "race-sim";
  }
  
  // Filter by preferred category
  let candidates = available.filter(w => w.category === preferredCategory);
  
  // If no matches, fall back to any available
  if (candidates.length === 0) {
    candidates = available;
  }
  
  // Rotate through available workouts based on block number
  // This ensures variety across weeks
  const rotationIndex = ((blockNumber - 1) * 2 + (sessionNumber - 1)) % candidates.length;
  const selected = candidates[rotationIndex];
  
  // Progressive overload: increase intensity every 2 blocks (4 weeks)
  const progressionCycle = Math.floor((blockNumber - 1) / 2);
  const intensityModifier = 1.0 + (progressionCycle * 0.1); // +10% every 2 blocks
  
  return {
    type: selected.type,
    intensityModifier
  };
}

/**
 * Get workout name for display
 */
export function getWorkoutName(type: CardioWorkoutType): string {
  const workout = CARDIO_WORKOUTS.find(w => w.type === type);
  return workout?.name || "Cardio Conditioning";
}

/**
 * Get workout duration
 */
export function getWorkoutDuration(type: CardioWorkoutType): number {
  const workout = CARDIO_WORKOUTS.find(w => w.type === type);
  return workout?.duration || 30;
}
