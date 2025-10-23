// Health data types for HealthKit and Health Connect integration

export interface HealthData {
  sleepHours?: number;
  sleepQuality?: number; // 1-5 scale
  restingHeartRate?: number;
  averageHeartRate?: number;
  steps?: number;
  activeCalories?: number;
  workoutMinutes?: number;
  vo2Max?: number;
}

export interface HeartRateZone {
  zone: 1 | 2 | 3 | 4 | 5;
  name: string;
  color: string;
  min: number;
  max: number;
  description: string;
}

export interface HeartRateSample {
  value: number;
  timestamp: Date;
  zone: HeartRateZone;
}

export interface SleepData {
  date: string;
  duration: number; // hours
  quality: number; // 1-5
  deepSleep?: number; // hours
  remSleep?: number; // hours
}

export interface WorkoutSummary {
  type: string;
  duration: number; // minutes
  calories: number;
  averageHeartRate?: number;
  maxHeartRate?: number;
  date: Date;
}

export type HealthPermission = 
  | 'steps'
  | 'heartRate'
  | 'restingHeartRate'
  | 'activeEnergyBurned'
  | 'sleepAnalysis'
  | 'vo2Max'
  | 'workouts';

