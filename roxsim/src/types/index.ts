export type HyroxType = 'full' | 'half' | 'frank' | 'secret' | 'circuit' | 'deka' | 'deka_half';
export type WorkoutId = 'hyrox_full' | 'hyrox_half' | 'frank_tank' | 'kettlebell_secret' | 'circuit_hiit' | 'deka_strong' | 'deka_half';

export interface HyroxStation {
  id: number;
  name: string;
  type: 'run' | 'station';
  distance?: number; // in meters for runs
  reps?: number; // for station exercises
  equipment?: string;
  instructions: string;
}

export interface SimulationState {
  type: HyroxType;
  currentStationIndex: number;
  stationTimes: number[]; // times in seconds
  totalTime: number;
  isActive: boolean;
  isPaused: boolean;
  startTime: number | null;
  pausedTime: number;
}

export interface SimulationResult {
  id: string;
  type: HyroxType;
  workoutId: WorkoutId;
  date: Date;
  totalTime: number;
  stationTimes: number[];
  stations: HyroxStation[];
}

export interface UserProfile {
  name: string;
  surname?: string;
  email?: string;
  dateOfBirth?: string; // DD/MM/YYYY format
  athletePhoto?: string; // Base64 data URL
  history: SimulationResult[];
  stats: {
    totalSims: number;
    bestFullTime: number | null;
    bestHalfTime: number | null;
  };
}

export interface Entitlements {
  hasHyroxPack: boolean;
  hasFrankTheTank: boolean;
}

export interface WorkoutDefinition {
  id: WorkoutId;
  title: string;
  subtitle: string;
  category: 'official' | 'custom';
  iapProductId?: string;
  priceText?: string;
  requiresPurchase: boolean;
  hasFreeTrial?: boolean;
  trialLimit?: number;
  hyroxType?: HyroxType;
  description?: string;
}



