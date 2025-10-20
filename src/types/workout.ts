export type ExerciseType = "weights" | "cardio" | "bodyweight" | "mobility";

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

