import { Exercise, WorkoutLog, UserSheet, UserStats } from "@/types/workout";

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const MASTER_SHEET_ID = import.meta.env.VITE_MASTER_SHEET_ID;
const USER_NAME = import.meta.env.VITE_USER_NAME || "frank";

// Debug logging
console.log("🔧 Google Sheets Service Configuration:");
console.log("  API_KEY:", API_KEY ? `${API_KEY.substring(0, 20)}...` : "❌ MISSING");
console.log("  MASTER_SHEET_ID:", MASTER_SHEET_ID || "❌ MISSING");
console.log("  USER_NAME:", USER_NAME);

// Cache for API responses (5 minutes TTL)
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests

async function waitForRateLimit() {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    const waitTime = MIN_REQUEST_INTERVAL - timeSinceLastRequest;
    console.log(`⏱️ Rate limit: waiting ${waitTime}ms`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

/**
 * Extract Google Sheet ID from various URL formats
 */
function extractSheetId(url: string): string {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : url;
}

/**
 * Fetch data from Google Sheets using the Sheets API with caching and rate limiting
 */
async function fetchSheetData(sheetId: string, range: string): Promise<any[][]> {
  const cacheKey = `${sheetId}:${range}`;
  
  // Check cache first
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`💾 Cache hit for ${range}`);
    return cached.data;
  }
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${API_KEY}`;
  
  console.log(`📡 Fetching sheet data:`, {
    sheetId,
    range,
    url: url.replace(API_KEY || '', 'API_KEY_HIDDEN'),
  });
  
  // Wait for rate limit
  await waitForRateLimit();
  
  try {
    const response = await fetch(url);
    
    console.log(`📥 Response status:`, response.status, response.statusText);
    
    if (response.status === 429) {
      console.error("❌ Rate limit exceeded! Waiting 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      // Try one more time
      const retryResponse = await fetch(url);
      if (!retryResponse.ok) {
        throw new Error("Rate limit exceeded - please wait a moment and refresh");
      }
      const retryData = await retryResponse.json();
      cache.set(cacheKey, { data: retryData.values || [], timestamp: Date.now() });
      return retryData.values || [];
    }
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("❌ API Error Response:", errorData);
      throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log(`✅ Data received:`, {
      range,
      rows: data.values?.length || 0,
      columns: data.values?.[0]?.length || 0,
      firstRow: data.values?.[0],
      sample: data.values?.slice(0, 3),
    });
    
    // Cache the response
    const values = data.values || [];
    cache.set(cacheKey, { data: values, timestamp: Date.now() });
    
    return values;
  } catch (error) {
    console.error("❌ Error fetching sheet data:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      sheetId,
      range,
    });
    return [];
  }
}

/**
 * Append data to Google Sheets
 * Note: This requires OAuth2 authentication, not just an API key
 * For write operations, you'll need to set up proper authentication
 */
async function appendSheetData(
  sheetId: string,
  range: string,
  values: any[][]
): Promise<boolean> {
  // This would require OAuth2 authentication
  // For now, we'll return false and log to console
  console.log("Append to sheet:", { sheetId, range, values });
  console.warn(
    "Sheet write operations require OAuth2 authentication. This is a placeholder."
  );
  return false;
}

/**
 * Get user's sheet ID from master sheet
 */
export async function getUserSheet(username: string = USER_NAME): Promise<UserSheet | null> {
  console.log(`👤 Getting user sheet for: ${username}`);
  
  try {
    // Fetch from first tab without specifying tab name (A:C will use first tab by default)
    const data = await fetchSheetData(MASTER_SHEET_ID, "A:C");
    
    console.log(`📋 Master sheet data:`, {
      totalRows: data.length,
      allUsers: data.slice(1).map(row => row[0]),
      fullData: data,
    });
    
    // Skip header row and find user
    for (let i = 1; i < data.length; i++) {
      const [user, password, sheetUrl] = data[i];
      console.log(`  Checking row ${i}:`, { user, password: password ? '***' : 'none', sheetUrl, match: user?.toLowerCase() === username.toLowerCase() });
      
      if (user?.toLowerCase() === username.toLowerCase()) {
        const userSheet = {
          user,
          password: password || '',
          sheetUrl,
          sheetId: extractSheetId(sheetUrl),
        };
        console.log(`✅ Found user sheet:`, userSheet);
        return userSheet;
      }
    }
    
    console.warn(`⚠️ User "${username}" not found in master sheet`);
    return null;
  } catch (error) {
    console.error("❌ Error fetching user sheet:", error);
    return null;
  }
}

/**
 * Fetch media URL from Videos tab in MASTER sheet as fallback
 */
async function fetchMediaFallback(
  exerciseName: string
): Promise<string | null> {
  try {
    // Look in MASTER sheet's videos tab (centralized media library)
    const videosData = await fetchSheetData(MASTER_SHEET_ID, "videos!A:B").catch(() => []);
    for (const row of videosData) {
      const [name, url] = row;
      if (name && name.toLowerCase().trim() === exerciseName.toLowerCase().trim() && url) {
        console.log(`🎥 Found video for "${exerciseName}" in master sheet videos tab:`, url);
        return url;
      }
    }
    
    console.log(`ℹ️ No media found for "${exerciseName}" in master sheet videos tab`);
    return null;
  } catch (error) {
    console.error("❌ Error fetching media fallback:", error);
    return null;
  }
}

/**
 * Get the maximum training day number from the user's sheet
 * This determines the cycle length (e.g., 6-day program, 12-day program)
 */
export async function getMaxTrainingDay(username: string = USER_NAME): Promise<number> {
  const userSheet = await getUserSheet(username);
  
  if (!userSheet) {
    return 1; // Default to 1 if no sheet found
  }

  try {
    const data = await fetchSheetData(userSheet.sheetId, "Plan!A2:A100");
    const dayNumbers = data
      .map(row => parseInt(row[0]?.toString().trim()))
      .filter(num => !isNaN(num) && num > 0);
    
    const maxDay = dayNumbers.length > 0 ? Math.max(...dayNumbers) : 1;
    console.log(`🔄 Program cycle length: ${maxDay} days`);
    return maxDay;
  } catch (error) {
    console.error("❌ Error getting max training day:", error);
    return 1;
  }
}

/**
 * Parse exercises from user's workout sheet for today
 * Expected format in Plan tab: Weekday | Exercise Name | Type | Sets | Reps | Suggested Weight | Personal Best | Duration | Distance | Notes | Media URL
 */
export async function fetchTodayExercises(username: string = USER_NAME): Promise<Exercise[]> {
  console.log(`🏋️ Fetching today's exercises for: ${username}`);
  
  const userSheet = await getUserSheet(username);
  
  if (!userSheet) {
    console.error("❌ User sheet not found - cannot fetch exercises");
    return [];
  }

  try {
    // Get current training day from localStorage or default to "1"
    const currentTrainingDay = localStorage.getItem("currentTrainingDay") || "1";
    console.log(`📅 Current Training Day: ${currentTrainingDay}`);
    
    // Fetch exercises from the Plan tab (now includes Notes and Media URL columns)
    console.log(`📊 Fetching from sheet: ${userSheet.sheetId}, tab: Plan`);
    const data = await fetchSheetData(userSheet.sheetId, "Plan!A2:K100");
    
    console.log(`📝 Raw data from Plan tab:`, {
      totalRows: data.length,
      sampleRows: data.slice(0, 5),
    });
    
    const filteredData = data.filter((row) => {
      // Filter by training day number and ensure exercise name exists
      const dayNumber = row[0]?.toString().trim();
      const exerciseName = row[1];
      
      // Normalize both to compare (handle both "1" and "01" formats)
      const normalizedDayNumber = dayNumber ? parseInt(dayNumber).toString().padStart(2, "0") : "";
      const normalizedCurrentDay = currentTrainingDay ? parseInt(currentTrainingDay).toString().padStart(2, "0") : "";
      
      const matches = normalizedDayNumber === normalizedCurrentDay && exerciseName;
      
      if (row[0] || row[1]) {
        console.log(`  Row filter:`, { dayNumber, normalizedDayNumber, currentTrainingDay, normalizedCurrentDay, exerciseName, matches });
      }
      
      return matches;
    });
    
    console.log(`🎯 Filtered to ${filteredData.length} exercises for Training Day ${currentTrainingDay}`);
    
    // Map exercises and fetch fallback media if needed
    const exercises = await Promise.all(
      filteredData.map(async (row, index) => {
        const [, name, type, sets, reps, suggestedKg, personalBest, durationMin, targetDistanceKm, notes, mediaUrl] = row;
        
        const typeValue = type?.toLowerCase() || "weights";
        let exerciseType: "weights" | "cardio" | "bodyweight" = "weights";
        
        if (typeValue === "cardio") {
          exerciseType = "cardio";
        } else if (typeValue === "bodyweight") {
          exerciseType = "bodyweight";
        } else {
          exerciseType = "weights";
        }

        // If no mediaUrl, try to fetch from videos tab in MASTER sheet
        let finalMediaUrl = mediaUrl || undefined;
        if (!finalMediaUrl && name) {
          const fallbackUrl = await fetchMediaFallback(name);
          if (fallbackUrl) {
            finalMediaUrl = fallbackUrl;
          }
        }

        const exercise: Exercise = {
          id: String(index + 1),
          name: name || "Unnamed Exercise",
          type: exerciseType,
          notes: notes || undefined,
          mediaUrl: finalMediaUrl,
        };

        if (exercise.type === "cardio") {
          exercise.durationMin = durationMin ? parseInt(durationMin) : 20;
          exercise.targetDistanceKm = targetDistanceKm ? parseFloat(targetDistanceKm) : 0;
          exercise.personalBest = personalBest || undefined;
        } else {
          // For weights and bodyweight exercises
          exercise.sets = sets ? parseInt(sets) : 3;
          exercise.reps = reps ? parseInt(reps) : 10;
          exercise.personalBest = personalBest || undefined;
          
          // Only add weight for "weights" type
          if (exercise.type === "weights") {
            exercise.suggestedKg = suggestedKg ? parseFloat(suggestedKg) : 0;
          }
        }

        console.log(`  ✅ Parsed exercise:`, exercise);
        return exercise;
      })
    );

    return exercises;
  } catch (error) {
    console.error("❌ Error fetching exercises:", {
      error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return [];
  }
}

/**
 * Fetch all exercises from Plan (not filtered by day) for navigation
 */
export async function fetchAllPlannedExercises(username: string = USER_NAME): Promise<Exercise[]> {
  const userSheet = await getUserSheet(username);
  
  if (!userSheet) {
    console.error("User sheet not found");
    return [];
  }

  try {
    const data = await fetchSheetData(userSheet.sheetId, "Plan!A2:K100");
    
    return data
      .filter((row) => row[1]) // Ensure exercise name exists
      .map((row, index) => {
        const [weekday, name, type, sets, reps, suggestedKg, personalBest, durationMin, targetDistanceKm, notes, mediaUrl] = row;
        
        const typeValue = type?.toLowerCase() || "weights";
        let exerciseType: "weights" | "cardio" | "bodyweight" = "weights";
        
        if (typeValue === "cardio") {
          exerciseType = "cardio";
        } else if (typeValue === "bodyweight") {
          exerciseType = "bodyweight";
        } else {
          exerciseType = "weights";
        }

        const exercise: Exercise = {
          id: String(index + 1),
          name: name || "Unnamed Exercise",
          type: exerciseType,
          weekday,
          notes: notes || undefined,
          mediaUrl: mediaUrl || undefined,
        };

        if (exercise.type === "cardio") {
          exercise.durationMin = durationMin ? parseInt(durationMin) : 20;
          exercise.targetDistanceKm = targetDistanceKm ? parseFloat(targetDistanceKm) : 0;
          exercise.personalBest = personalBest || undefined;
        } else {
          // For weights and bodyweight exercises
          exercise.sets = sets ? parseInt(sets) : 3;
          exercise.reps = reps ? parseInt(reps) : 10;
          exercise.personalBest = personalBest || undefined;
          
          // Only add weight for "weights" type
          if (exercise.type === "weights") {
            exercise.suggestedKg = suggestedKg ? parseFloat(suggestedKg) : 0;
          }
        }

        return exercise;
      });
  } catch (error) {
    console.error("Error fetching all exercises:", error);
    return [];
  }
}

/**
 * Fetch workout history
 * Expected format: Exercise | Date | Weight | RPE | Is PB | Duration | Distance | Notes
 */
export async function fetchWorkoutHistory(username: string = USER_NAME): Promise<WorkoutLog[]> {
  const userSheet = await getUserSheet(username);
  
  if (!userSheet) {
    console.error("User sheet not found");
    return [];
  }

  try {
    const data = await fetchSheetData(userSheet.sheetId, "History!A2:H100");
    
    return data
      .filter((row) => row[0]) // Filter out empty rows
      .map((row, index) => {
        const [exercise, date, weight, rpe, isPB, duration, distance, notes] = row;
        
        return {
          id: String(index + 1),
          exercise: exercise || "Unknown",
          date: date || new Date().toLocaleString(),
          weight: weight ? parseFloat(weight) : undefined,
          rpe: rpe ? parseInt(rpe) : undefined,
          isPB: isPB?.toLowerCase() === "true" || isPB?.toLowerCase() === "yes",
          duration: duration ? parseInt(duration) : undefined,
          distance: distance ? parseFloat(distance) : undefined,
          notes: notes || undefined,
        };
      })
      .reverse(); // Most recent first
  } catch (error) {
    console.error("Error fetching workout history:", error);
    return [];
  }
}

/**
 * Calculate stats from workout history
 */
export async function fetchUserStats(username: string = USER_NAME): Promise<UserStats> {
  const history = await fetchWorkoutHistory(username);
  
  // Calculate this week's stats
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  
  const thisWeekHistory = history.filter((log) => {
    const logDate = new Date(log.date);
    return logDate >= oneWeekAgo;
  });

  const thisWeekStats = {
    workouts: new Set(thisWeekHistory.map((log) => log.date.split(" ")[0])).size,
    exercises: thisWeekHistory.length,
    totalWeight: thisWeekHistory.reduce(
      (sum, log) => sum + (log.weight || 0) * ((log.rpe || 0) > 0 ? log.rpe : 1),
      0
    ),
  };

  // Get personal bests
  const pbMap = new Map<string, { value: string; date: string }>();
  
  history.forEach((log) => {
    if (log.isPB && log.weight) {
      const existing = pbMap.get(log.exercise);
      if (!existing || parseFloat(log.weight.toString()) > parseFloat(existing.value)) {
        pbMap.set(log.exercise, {
          value: `${log.weight}kg`,
          date: log.date.split(" at ")[0] || log.date,
        });
      }
    }
  });

  const personalBests = Array.from(pbMap.entries()).map(([exercise, data]) => ({
    exercise,
    ...data,
  }));

  return {
    thisWeek: thisWeekStats,
    personalBests,
  };
}

/**
 * Log a completed exercise
 * Note: This is a placeholder - actual implementation requires OAuth2
 */
/**
 * Log exercise to LOCAL STORAGE (temporary solution until Apps Script is fixed)
 */
export async function logExercise(
  exerciseName: string,
  data: {
    weight?: number;
    sets?: number;
    reps?: number;
    rpe?: number;
    duration?: number;
    distance?: number;
    notes?: string;
  },
  username: string = USER_NAME
): Promise<{ success: boolean; message?: string; isPB?: boolean; oldPB?: number; newPB?: number }> {
  try {
    console.log("📝 Logging exercise to LOCAL STORAGE:", exerciseName, data);
    
    // Get existing logs from localStorage
    const existingLogs = localStorage.getItem("workoutHistory");
    const logs = existingLogs ? JSON.parse(existingLogs) : [];
    
    // Create new log entry
    const timestamp = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    const newLog = {
      id: Date.now().toString(),
      username,
      exerciseName,
      timestamp,
      weight: data.weight,
      sets: data.sets,
      reps: data.reps,
      rpe: data.rpe,
      duration: data.duration,
      distance: data.distance,
      notes: data.notes,
    };
    
    // Add to logs
    logs.unshift(newLog); // Add to beginning
    
    // Keep only last 100 logs
    if (logs.length > 100) {
      logs.splice(100);
    }
    
    // Save back to localStorage
    localStorage.setItem("workoutHistory", JSON.stringify(logs));
    
    console.log("✅ Exercise logged successfully to local storage");
    console.log("📊 Total logs:", logs.length);
    
    return {
      success: true,
      message: "Workout logged successfully (saved locally)",
      isPB: false,
    };
  } catch (error) {
    console.error("❌ Error logging exercise:", error);
    return { success: false, message: error instanceof Error ? error.message : "Unknown error" };
  }
}

