/**
 * Standardized Types for Program Generation
 * 
 * ALL UNITS ARE STANDARDIZED:
 * - Duration: ALWAYS in seconds (not minutes)
 * - Distance: ALWAYS in meters (not km)
 * - Weight: ALWAYS in kg
 * - Reps/Sets: ALWAYS integers
 */

export interface WorkoutSession {
  day: string; // "Monday", "Tuesday", etc.
  type: "run" | "strength" | "cardio" | "recovery";
  title: string;
  distance?: string; // e.g., "8km", "500m"
  pace?: string;
  effort: "easy" | "moderate" | "hard";
  detail?: string;
}

export interface Programme {
  sessions: WorkoutSession[];
  preferences: any;
  generatedAt: string;
  blockNumber: number;
  focus: "base" | "build" | "race-prep";
}

export interface StandardizedExerciseParams {
  durationSeconds?: number; // ALWAYS seconds
  distanceMeters?: number;  // ALWAYS meters
  weightKg?: number;        // ALWAYS kg
  sets?: number;
  reps?: number;
  restSeconds?: number;     // ALWAYS seconds
  notes?: string;
  pace?: string;
}

// ==================== CONVERSION UTILITIES ====================

/**
 * Convert distance string to meters
 * Examples: "5km" → 5000, "500m" → 500, "8-10km" → 9000 (average)
 */
export function parseDistanceToMeters(distanceStr: string): number {
  if (!distanceStr) return 0;
  
  // Handle ranges like "8-10km"
  const rangeMatch = distanceStr.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)\s*(km|m)/i);
  if (rangeMatch) {
    const min = parseFloat(rangeMatch[1]);
    const max = parseFloat(rangeMatch[2]);
    const avg = (min + max) / 2;
    const unit = rangeMatch[3].toLowerCase();
    return unit === 'km' ? avg * 1000 : avg;
  }
  
  // Handle single values like "5km" or "500m"
  const singleMatch = distanceStr.match(/(\d+(?:\.\d+)?)\s*(km|m)/i);
  if (singleMatch) {
    const value = parseFloat(singleMatch[1]);
    const unit = singleMatch[2].toLowerCase();
    return unit === 'km' ? value * 1000 : value;
  }
  
  console.warn(`⚠️ Could not parse distance: "${distanceStr}"`);
  return 0;
}

/**
 * Convert duration string to seconds
 * Examples: "45min" → 2700, "90s" → 90, "45-60min" → 3150 (average)
 */
export function parseDurationToSeconds(durationStr: string): number {
  if (!durationStr) return 0;
  
  // Handle ranges like "45-60min"
  const rangeMatch = durationStr.match(/(\d+)\s*[-–—]\s*(\d+)\s*(min|s|sec)/i);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    const avg = Math.round((min + max) / 2);
    const unit = rangeMatch[3].toLowerCase();
    return unit.startsWith('min') ? avg * 60 : avg;
  }
  
  // Handle single values like "45min" or "90s"
  const singleMatch = durationStr.match(/(\d+)\s*(min|s|sec)/i);
  if (singleMatch) {
    const value = parseInt(singleMatch[1]);
    const unit = singleMatch[2].toLowerCase();
    return unit.startsWith('min') ? value * 60 : value;
  }
  
  console.warn(`⚠️ Could not parse duration: "${durationStr}"`);
  return 0;
}

/**
 * Convert meters to km string for display
 * Examples: 5000 → "5km", 500 → "500m"
 */
export function metersToDisplayString(meters: number): string {
  if (meters >= 1000 && meters % 1000 === 0) {
    return `${meters / 1000}km`;
  } else if (meters >= 1000) {
    return `${(meters / 1000).toFixed(1)}km`;
  }
  return `${meters}m`;
}

/**
 * Convert seconds to minutes string for display
 * Examples: 2700 → "45min", 90 → "90s"
 */
export function secondsToDisplayString(seconds: number): string {
  if (seconds >= 60 && seconds % 60 === 0) {
    return `${seconds / 60}min`;
  } else if (seconds >= 60) {
    return `${Math.round(seconds / 60)}min`;
  }
  return `${seconds}s`;
}

/**
 * Calculate run duration based on distance and pace
 * @param distanceMeters - Distance in meters
 * @param paceMinPerKm - Pace in minutes per km (default 6:00/km for Zone 2)
 * @returns Duration in seconds
 */
export function calculateRunDuration(distanceMeters: number, paceMinPerKm: number = 6): number {
  const km = distanceMeters / 1000;
  return Math.round(km * paceMinPerKm * 60);
}

/**
 * Validate exercise parameters
 */
export function validateExerciseParams(params: StandardizedExerciseParams): string[] {
  const errors: string[] = [];
  
  if (params.durationSeconds !== undefined && params.durationSeconds < 0) {
    errors.push(`Invalid duration: ${params.durationSeconds} seconds`);
  }
  
  if (params.distanceMeters !== undefined && params.distanceMeters < 0) {
    errors.push(`Invalid distance: ${params.distanceMeters} meters`);
  }
  
  if (params.weightKg !== undefined && params.weightKg < 0) {
    errors.push(`Invalid weight: ${params.weightKg} kg`);
  }
  
  if (params.sets !== undefined && params.sets < 0) {
    errors.push(`Invalid sets: ${params.sets}`);
  }
  
  if (params.reps !== undefined && params.reps < 0) {
    errors.push(`Invalid reps: ${params.reps}`);
  }
  
  return errors;
}

