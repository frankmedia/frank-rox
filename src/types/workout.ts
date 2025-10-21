export type ExerciseType = "weights" | "cardio" | "bodyweight" | "mobility" | "hiit" | "circuit" | "amrap" | "intro";

export interface Exercise {
  id: string;
  name: string;
  type: ExerciseType;
  weekday?: string;
  sets?: number;
  reps?: number;
  suggestedKg?: number;
  personalBest?: string;
  durationMin?: number;
  targetDistanceKm?: number;
  notes?: string;
  mediaUrl?: string;
  // New fields for grouped workouts
  groupId?: string; // Links exercises in same circuit/amrap
  isGroupHeader?: boolean; // True for the header row (e.g., "CIRCUIT: Lower Body")
  exercises?: Exercise[]; // For grouped types, contains child exercises
  workRestRatio?: string; // For HIIT (e.g., "20s/10s")
  totalRounds?: number; // For circuit (fixed rounds) or tracking amrap
  timeCap?: number; // For AMRAP (minutes)
}

export interface WorkoutLog {
  id: string;
  exercise: string;
  date: string;
  weight?: number;
  isPB?: boolean;
  duration?: number;
  distance?: number;
  notes?: string;
}

export interface UserStats {
  thisWeek: {
    workouts: number;
    exercises: number;
    totalWeight: number;
  };
  personalBests: {
    exercise: string;
    value: string;
    date: string;
  }[];
}

export interface UserSheet {
  user: string;
  password: string;
  sheetUrl: string;
  sheetId: string;
}

