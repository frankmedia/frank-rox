/**
 * Hybrid Workout Cache Service
 * Immediately stores workout completion data to both localStorage and Supabase
 * This ensures ticks/checkmarks persist even if user refreshes or loses connection
 */

import { supabase } from "@/utils/supabaseClient";

// ============================================
// TYPES
// ============================================

export interface CircuitRoundData {
  exerciseId: string;
  exerciseName: string;
  completedRounds: number[]; // Array of completed round numbers [1, 2, 3]
}

export interface WorkoutSessionCache {
  date: string; // YYYY-MM-DD
  trainingDay: number;
  username: string;
  clientId?: string;
  
  // Circuit/HIIT/AMRAP progress
  circuitProgress: Record<string, CircuitRoundData>; // key: parentExerciseId
  
  // Individual exercise completions
  completedExercises: string[]; // exercise IDs that are fully complete
  
  lastUpdated: string; // ISO timestamp
}

// ============================================
// STORAGE KEYS
// ============================================

const CACHE_KEY_PREFIX = "workout_cache_";

function getCacheKey(username: string): string {
  return `${CACHE_KEY_PREFIX}${username}`;
}

function getTodayDate(): string {
  return new Date().toISOString().split("T")[0]; // YYYY-MM-DD
}

// ============================================
// LOCAL STORAGE OPERATIONS
// ============================================

export function getWorkoutCache(username: string, trainingDay: number): WorkoutSessionCache {
  const key = getCacheKey(username);
  const stored = localStorage.getItem(key);
  const today = getTodayDate();

  if (stored) {
    try {
      const cache: WorkoutSessionCache = JSON.parse(stored);
      
      // Reset if it's a new day or different training day
      if (cache.date === today && cache.trainingDay === trainingDay) {
        return cache;
      }
    } catch (e) {
      console.error("Error parsing workout cache:", e);
    }
  }

  // Initialize new cache
  const newCache: WorkoutSessionCache = {
    date: today,
    trainingDay,
    username,
    circuitProgress: {},
    completedExercises: [],
    lastUpdated: new Date().toISOString(),
  };

  localStorage.setItem(key, JSON.stringify(newCache));
  return newCache;
}

function saveWorkoutCache(cache: WorkoutSessionCache): void {
  cache.lastUpdated = new Date().toISOString();
  const key = getCacheKey(cache.username);
  localStorage.setItem(key, JSON.stringify(cache));
}

// ============================================
// CIRCUIT PROGRESS TRACKING
// ============================================

export function markCircuitRound(
  username: string,
  trainingDay: number,
  parentExerciseId: string,
  exerciseId: string,
  exerciseName: string,
  roundNumber: number
): void {
  const cache = getWorkoutCache(username, trainingDay);

  if (!cache.circuitProgress[parentExerciseId]) {
    cache.circuitProgress[parentExerciseId] = {
      exerciseId,
      exerciseName,
      completedRounds: [],
    };
  }

  const progress = cache.circuitProgress[parentExerciseId];
  
  // Toggle: if already completed, remove it; otherwise add it
  if (progress.completedRounds.includes(roundNumber)) {
    progress.completedRounds = progress.completedRounds.filter(r => r !== roundNumber);
  } else {
    progress.completedRounds.push(roundNumber);
    progress.completedRounds.sort((a, b) => a - b);
  }

  saveWorkoutCache(cache);
}

export function getCircuitProgress(
  username: string,
  trainingDay: number,
  parentExerciseId: string
): Record<string, number[]> {
  const cache = getWorkoutCache(username, trainingDay);
  const progress = cache.circuitProgress[parentExerciseId];
  
  if (!progress) {
    return {};
  }

  // Return in format expected by CircuitWorkout: { exerciseId: [1, 2, 3] }
  return {
    [progress.exerciseId]: progress.completedRounds,
  };
}

export function getAllCircuitProgress(
  username: string,
  trainingDay: number
): Record<string, Record<string, number[]>> {
  const cache = getWorkoutCache(username, trainingDay);
  const result: Record<string, Record<string, number[]>> = {};

  Object.keys(cache.circuitProgress).forEach(parentId => {
    const progress = cache.circuitProgress[parentId];
    result[parentId] = {
      [progress.exerciseId]: progress.completedRounds,
    };
  });

  return result;
}

// ============================================
// EXERCISE COMPLETION TRACKING
// ============================================

export function markExerciseComplete(
  username: string,
  trainingDay: number,
  exerciseId: string,
  clientId?: string
): void {
  const cache = getWorkoutCache(username, trainingDay);

  if (!cache.completedExercises.includes(exerciseId)) {
    cache.completedExercises.push(exerciseId);
    cache.clientId = clientId || cache.clientId;
    saveWorkoutCache(cache);
  }
}

export function isExerciseComplete(
  username: string,
  trainingDay: number,
  exerciseId: string
): boolean {
  const cache = getWorkoutCache(username, trainingDay);
  return cache.completedExercises.includes(exerciseId);
}

export function unmarkExerciseComplete(
  username: string,
  trainingDay: number,
  exerciseId: string
): void {
  const cache = getWorkoutCache(username, trainingDay);
  cache.completedExercises = cache.completedExercises.filter(id => id !== exerciseId);
  saveWorkoutCache(cache);
}

// ============================================
// PERSONAL BEST DETECTION
// ============================================

/**
 * Check if a workout is a personal best by comparing against historical data
 */
export async function checkPersonalBest(
  clientId: string,
  exerciseName: string,
  logData: {
    weight?: number;
    weights?: number[];
    duration?: number;
    distance?: number;
  }
): Promise<{ isPB: boolean; oldPB?: number; newPB?: number }> {
  try {
    // Fetch all previous logs for this exercise
    const { data: previousLogs, error } = await supabase
      .from("workout_logs")
      .select("weight, weights, duration_min, distance_km")
      .eq("client_id", clientId)
      .eq("exercise_name", exerciseName)
      .order("logged_at", { ascending: false });

    if (error) {
      console.error("Error fetching previous logs for PB check:", error);
      return { isPB: false };
    }

    if (!previousLogs || previousLogs.length === 0) {
      // First time doing this exercise - it's a PB by default!
      if (logData.weight || (logData.weights && logData.weights.length > 0)) {
        const newPB = logData.weights && logData.weights.length > 0
          ? Math.max(...logData.weights)
          : logData.weight || 0;
        console.log(`🏆 First time doing "${exerciseName}" - PB: ${newPB}kg`);
        return { isPB: true, newPB };
      }
      return { isPB: false };
    }

    // Check for weight-based PB
    if (logData.weight || (logData.weights && logData.weights.length > 0)) {
      const newWeight = logData.weights && logData.weights.length > 0
        ? Math.max(...logData.weights)
        : logData.weight || 0;

      // Find the current PB from previous logs
      let currentPB = 0;
      previousLogs.forEach((log: any) => {
        let logWeight = 0;
        if (log.weights && log.weights.length > 0) {
          logWeight = Math.max(...log.weights);
        } else if (log.weight) {
          logWeight = log.weight;
        }
        if (logWeight > currentPB) {
          currentPB = logWeight;
        }
      });

      if (newWeight > currentPB) {
        console.log(`🏆 NEW PB for "${exerciseName}"! Old: ${currentPB}kg → New: ${newWeight}kg`);
        return { isPB: true, oldPB: currentPB > 0 ? currentPB : undefined, newPB: newWeight };
      }
    }

    // Check for duration-based PB (shorter is better for most cardio)
    if (logData.duration && logData.duration > 0) {
      const newDuration = logData.duration;
      let currentBestDuration = Infinity;
      
      previousLogs.forEach((log: any) => {
        if (log.duration_min && log.duration_min > 0) {
          if (log.duration_min < currentBestDuration) {
            currentBestDuration = log.duration_min;
          }
        }
      });

      if (currentBestDuration === Infinity || newDuration < currentBestDuration) {
        console.log(`🏆 NEW PB for "${exerciseName}"! Duration: ${newDuration}min`);
        return { isPB: true };
      }
    }

    // Check for distance-based PB (longer is better)
    if (logData.distance && logData.distance > 0) {
      const newDistance = logData.distance;
      let currentBestDistance = 0;
      
      previousLogs.forEach((log: any) => {
        if (log.distance_km && log.distance_km > currentBestDistance) {
          currentBestDistance = log.distance_km;
        }
      });

      if (newDistance > currentBestDistance) {
        console.log(`🏆 NEW PB for "${exerciseName}"! Distance: ${newDistance}km`);
        return { isPB: true };
      }
    }

    return { isPB: false };
  } catch (err) {
    console.error("Error checking personal best:", err);
    return { isPB: false };
  }
}

// ============================================
// SUPABASE SYNC (IMMEDIATE)
// ============================================

/**
 * Immediately sync workout log to Supabase (hybrid approach)
 * This runs right after marking an exercise as done, not waiting for "Complete Day"
 */
export async function syncWorkoutLogToSupabase(
  clientId: string,
  planId: string | null,
  trainingDay: number,
  logData: {
    exerciseName: string;
    weight?: number;
    weights?: number[];
    sets?: number;
    reps?: number;
    duration?: number;
    distance?: number;
    rating?: number;
    notes?: string;
    isPB?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const timestamp = new Date().toISOString();

    const workoutLog = {
      client_id: clientId,
      plan_id: planId,
      training_day: trainingDay,
      exercise_name: logData.exerciseName,
      logged_at: timestamp,
      weight: logData.weight || null,
      weights: logData.weights || null,
      sets: logData.sets || null,
      reps: logData.reps || null,
      duration_min: logData.duration || null,
      distance_km: logData.distance || null,
      notes: logData.notes || null,
      rating: logData.rating || null,
      is_pb: logData.isPB || false,
    };

    console.log("💾 Syncing workout log to Supabase:", workoutLog);

    const { error } = await supabase
      .from("workout_logs")
      .insert(workoutLog);

    if (error) {
      console.error("❌ Error syncing to Supabase:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Successfully synced to Supabase");
    return { success: true };
  } catch (err) {
    console.error("❌ Unexpected error syncing to Supabase:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error" 
    };
  }
}

/**
 * Sync circuit completion to Supabase
 * Logs each round of each exercise as a separate workout log
 */
export async function syncCircuitToSupabase(
  clientId: string,
  planId: string | null,
  trainingDay: number,
  circuitName: string,
  exercises: Array<{
    id: string;
    name: string;
    type?: string;
    reps?: number;
    sets?: number;
    suggestedKg?: number;
    durationMin?: number;
    targetDistanceKm?: number;
  }>,
  completedRounds: Record<string, number[]>
): Promise<{ success: boolean; error?: string }> {
  try {
    const timestamp = new Date().toISOString();
    const logsToInsert = [];

    for (const exercise of exercises) {
      const rounds = completedRounds[exercise.id] || [];
      
      if (rounds.length > 0) {
        // Log each completed exercise with the number of rounds
        logsToInsert.push({
          client_id: clientId,
          plan_id: planId,
          training_day: trainingDay,
          exercise_name: `${circuitName} - ${exercise.name}`,
          logged_at: timestamp,
          sets: rounds.length, // Number of rounds completed
          reps: exercise.reps || null,
          weight: exercise.suggestedKg || null,
          duration_min: exercise.durationMin || null,
          distance_km: exercise.targetDistanceKm || null,
          notes: `Completed rounds: ${rounds.join(", ")}`,
          rating: null,
          is_pb: false,
        });
      }
    }

    if (logsToInsert.length === 0) {
      console.log("⚠️  No circuit logs to sync");
      return { success: true };
    }

    console.log("💾 Syncing circuit logs to Supabase:", logsToInsert);

    const { error } = await supabase
      .from("workout_logs")
      .insert(logsToInsert);

    if (error) {
      console.error("❌ Error syncing circuit to Supabase:", error);
      return { success: false, error: error.message };
    }

    console.log("✅ Successfully synced circuit to Supabase");
    return { success: true };
  } catch (err) {
    console.error("❌ Unexpected error syncing circuit to Supabase:", err);
    return { 
      success: false, 
      error: err instanceof Error ? err.message : "Unknown error" 
    };
  }
}

// ============================================
// CACHE MANAGEMENT
// ============================================

export function clearWorkoutCache(username: string): void {
  const key = getCacheKey(username);
  localStorage.removeItem(key);
  console.log("🧹 Cleared workout cache for", username);
}

export function getCompletionStats(
  username: string,
  trainingDay: number,
  totalExercises: number
): {
  completed: number;
  total: number;
  percentage: number;
  allComplete: boolean;
} {
  const cache = getWorkoutCache(username, trainingDay);
  const completed = cache.completedExercises.length;

  return {
    completed,
    total: totalExercises,
    percentage: totalExercises > 0 ? Math.round((completed / totalExercises) * 100) : 0,
    allComplete: completed === totalExercises && totalExercises > 0,
  };
}

/**
 * Get all cached workout data for display purposes
 */
export function getAllCachedData(username: string, trainingDay: number): WorkoutSessionCache {
  return getWorkoutCache(username, trainingDay);
}

