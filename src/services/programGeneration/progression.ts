/**
 * Progressive Overload Logic for Week 2
 * 
 * CLEAR RULES:
 * - Strength: +2 reps per exercise (NOT warm-ups)
 * - Cardio runs: +1km distance, recalculate duration at 6 min/km
 * - Intervals: +2 rounds
 * - Timed holds (plank): +15 seconds (max 120s)
 * - Warm-ups: NO PROGRESSION (stay consistent)
 */

import { calculateRunDuration } from './types';

export interface ProgressionRules {
  strengthRepsIncrease: number;      // +2 reps
  cardioDistanceIncrease: number;    // +1000m (1km)
  intervalRoundsIncrease: number;    // +2 rounds
  timedHoldIncrease: number;         // +15 seconds
  maxPlankDuration: number;          // 120 seconds (2 min)
}

export const DEFAULT_PROGRESSION: ProgressionRules = {
  strengthRepsIncrease: 2,
  cardioDistanceIncrease: 1000, // 1km in meters
  intervalRoundsIncrease: 2,
  timedHoldIncrease: 15,
  maxPlankDuration: 120,
};

/**
 * Check if a block is a warm-up (should NOT have progression)
 */
export function isWarmupBlock(blockTitle: string): boolean {
  if (!blockTitle) return false;
  const lower = blockTitle.toLowerCase();
  return lower.includes('warm') || lower.includes('activation') || lower.includes('cool');
}

/**
 * Apply progression to reps (strength exercises only)
 */
export function progressReps(
  currentReps: number | null,
  blockType: string,
  blockTitle: string,
  rules: ProgressionRules = DEFAULT_PROGRESSION
): number | null {
  if (!currentReps || blockType !== 'strength') return currentReps;
  if (isWarmupBlock(blockTitle)) return currentReps; // No progression for warm-ups
  
  return currentReps + rules.strengthRepsIncrease;
}

/**
 * Apply progression to timed holds (plank, etc.)
 */
export function progressTimedHold(
  currentDurationSeconds: number | null,
  blockType: string,
  blockTitle: string,
  hasDistance: boolean,
  rules: ProgressionRules = DEFAULT_PROGRESSION
): number | null {
  if (!currentDurationSeconds || blockType !== 'strength') return currentDurationSeconds;
  if (isWarmupBlock(blockTitle)) return currentDurationSeconds; // No progression for warm-ups
  if (hasDistance) return currentDurationSeconds; // Don't progress if it's a run with distance
  
  const newDuration = currentDurationSeconds + rules.timedHoldIncrease;
  return Math.min(newDuration, rules.maxPlankDuration); // Cap at 2 minutes
}

/**
 * Apply progression to cardio distance (runs)
 */
export function progressCardioDistance(
  currentDistanceMeters: number | null,
  blockType: string,
  rules: ProgressionRules = DEFAULT_PROGRESSION
): number | null {
  if (!currentDistanceMeters || blockType !== 'cardio') return currentDistanceMeters;
  
  const currentKm = Math.round(currentDistanceMeters / 1000);
  
  // Long runs (10km+): +2km
  if (currentKm >= 10) {
    return (currentKm + 2) * 1000;
  }
  
  // Medium runs (5-9km): +1km
  if (currentKm >= 5) {
    return (currentKm + 1) * 1000;
  }
  
  // Short distances (<5km): no change (intervals, etc.)
  return currentDistanceMeters;
}

/**
 * Recalculate run duration based on new distance
 * ALWAYS use 6 min/km pace for consistency
 */
export function recalculateRunDuration(
  newDistanceMeters: number,
  oldDistanceMeters: number,
  blockType: string
): number | null {
  if (blockType !== 'cardio') return null;
  if (newDistanceMeters === oldDistanceMeters) return null; // No change
  
  return calculateRunDuration(newDistanceMeters, 6); // 6 min/km pace
}

/**
 * Apply progression to interval rounds
 */
export function progressIntervalRounds(
  currentRounds: number | null,
  blockFormat: string | undefined,
  rules: ProgressionRules = DEFAULT_PROGRESSION
): number | null {
  if (!currentRounds) return currentRounds;
  if (blockFormat !== 'circuit') return currentRounds; // Only for circuits/intervals
  
  return currentRounds + rules.intervalRoundsIncrease;
}

/**
 * Main function to apply ALL progression rules to an exercise item
 */
export function applyProgressionToItem(item: {
  sets: number | null;
  reps: number | null;
  distance_m: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
}, block: {
  block_type: string;
  title: string;
  parameters?: any;
}): {
  sets: number | null;
  reps: number | null;
  distance_m: number | null;
  duration_sec: number | null;
  rest_sec: number | null;
} {
  const progressed = {
    sets: item.sets,
    reps: progressReps(item.reps, block.block_type, block.title),
    distance_m: progressCardioDistance(item.distance_m, block.block_type),
    duration_sec: item.duration_sec,
    rest_sec: item.rest_sec,
  };
  
  // Recalculate duration if distance changed
  if (progressed.distance_m && progressed.distance_m !== item.distance_m) {
    const newDuration = recalculateRunDuration(
      progressed.distance_m,
      item.distance_m || 0,
      block.block_type
    );
    if (newDuration) {
      progressed.duration_sec = newDuration;
      console.log(`📏 Week 2 progression: ${item.distance_m}m → ${progressed.distance_m}m, duration recalculated to ${Math.round(newDuration / 60)} min`);
    }
  } else {
    // Progress timed holds (plank, etc.)
    progressed.duration_sec = progressTimedHold(
      item.duration_sec,
      block.block_type,
      block.title,
      !!item.distance_m
    );
  }
  
  return progressed;
}

/**
 * Apply progression to block rounds (intervals)
 */
export function applyProgressionToBlock(block: {
  rounds: number | null;
  parameters?: any;
}): {
  rounds: number | null;
} {
  const blockFormat = block.parameters?.format;
  
  return {
    rounds: progressIntervalRounds(block.rounds, blockFormat),
  };
}

