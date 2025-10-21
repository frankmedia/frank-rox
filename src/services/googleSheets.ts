import { Exercise, WorkoutLog, UserSheet, UserStats } from "@/types/workout";

const API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY;
const MASTER_SHEET_ID = import.meta.env.VITE_MASTER_SHEET_ID;

// Get the currently logged-in user from localStorage
function getCurrentUser(): string {
  try {
    const userStr = localStorage.getItem("frank_rock_user");
    if (userStr) {
      const user = JSON.parse(userStr);
      return user.username || "frank";
    }
  } catch (e) {
  }
  return "frank"; // Fallback
}

// Debug logging

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
    return cached.data;
  }
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${API_KEY}`;
  
    sheetId,
    range,
    url: url.replace(API_KEY || '', 'API_KEY_HIDDEN'),
  });
  
  // Wait for rate limit
  await waitForRateLimit();
  
  try {
    const response = await fetch(url);
    
    
    if (response.status === 429) {
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
      throw new Error(`Failed to fetch sheet data: ${response.statusText}`);
    }
    
    const data = await response.json();
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
    "Sheet write operations require OAuth2 authentication. This is a placeholder."
  );
  return false;
}

/**
 * Get user's sheet ID from master sheet
 */
export async function getUserSheet(username: string = getCurrentUser()): Promise<UserSheet | null> {
  
  try {
    // Fetch from first tab without specifying tab name (A:C will use first tab by default)
    const data = await fetchSheetData(MASTER_SHEET_ID, "A:C");
    
      totalRows: data.length,
      allUsers: data.slice(1).map(row => row[0]),
      fullData: data,
    });
    
    // Skip header row and find user
    for (let i = 1; i < data.length; i++) {
      const [user, password, sheetUrl] = data[i];
      
      if (user?.toLowerCase() === username.toLowerCase()) {
        const userSheet = {
          user,
          password: password || '',
          sheetUrl,
          sheetId: extractSheetId(sheetUrl),
        };
        return userSheet;
      }
    }
    
    return null;
  } catch (error) {
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
        return url;
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Get the maximum training day number from the user's sheet
 * This determines the cycle length (e.g., 6-day program, 12-day program)
 */
export async function getMaxTrainingDay(username: string = getCurrentUser()): Promise<number> {
  const userSheet = await getUserSheet(username);
  
  if (!userSheet) {
    return 1; // Default to 1 if no sheet found
  }

  try {
    const data = await fetchSheetData(userSheet.sheetId, "Plan!A2:A500");
      totalRows: data.length,
      firstFewRows: data.slice(0, 20).map(row => row[0]),
      allDayValues: data.map(row => row[0])
    });
    
    const dayNumbers = data
      .map(row => parseInt(row[0]?.toString().trim()))
      .filter(num => !isNaN(num) && num > 0);
    
    
    const maxDay = dayNumbers.length > 0 ? Math.max(...dayNumbers) : 1;
    return maxDay;
  } catch (error) {
    return 1;
  }
}

/**
 * Parse exercises from user's workout sheet for today
 * Expected format in Plan tab: Weekday | Exercise Name | Type | Sets | Reps | Suggested Weight | Personal Best | Duration | Distance | Notes | Media URL
 */
export async function fetchTodayExercises(username: string = getCurrentUser()): Promise<Exercise[]> {
  
  const userSheet = await getUserSheet(username);
  
  if (!userSheet) {
    return [];
  }

  try {
    // Get current training day from user-specific localStorage or default to "1"
    let currentTrainingDay = "1";
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userKey = `currentTrainingDay_${user.username}`;
        currentTrainingDay = localStorage.getItem(userKey) || "1";
      }
    } catch (e) {
    }
    
    // Fetch exercises from the Plan tab (now includes Notes and Media URL columns)
    const data = await fetchSheetData(userSheet.sheetId, "Plan!A2:K500");
    
      totalRows: data.length,
      sampleRows: data.slice(0, 5),
    });
    
    const filteredData = data.filter((row) => {
      // Filter by training day number and ensure exercise name exists
      const dayNumber = row[0]?.toString().trim();
      const exerciseName = row[1];
      
      // Normalize both to compare (convert to numbers to handle "1", "01", "001" formats)
      const normalizedDayNumber = dayNumber ? parseInt(dayNumber).toString() : "";
      const normalizedCurrentDay = currentTrainingDay ? parseInt(currentTrainingDay).toString() : "";
      
      const matches = normalizedDayNumber === normalizedCurrentDay && exerciseName;
      
      if (row[0] || row[1]) {
      }
      
      return matches;
    });
    
    
    // First pass: parse all rows into exercises
    const parsedExercises = await Promise.all(
      filteredData.map(async (row, index) => {
        const [, name, type, sets, reps, suggestedKg, personalBest, durationMin, targetDistanceKm, notes, mediaUrl] = row;
        
          type: type,
          sets: sets,
          reps: reps,
          kg: suggestedKg,
          pb: personalBest,
          durationMin: durationMin,
          targetDistanceKm: targetDistanceKm,
          notes: notes,
          mediaUrl: mediaUrl,
          fullRow: row,
          rowLength: row.length
        });
        
        const typeValue = type?.toString().toLowerCase().trim() || "weights";
        
        let exerciseType: Exercise["type"] = "weights";
        let isGroupHeader = false;
        
        
        // Simple type detection based on type column only
        if (typeValue === "intro") {
          exerciseType = "intro";
          isGroupHeader = false;
        } else if (typeValue === "circuit") {
          exerciseType = "circuit";
          isGroupHeader = true;
        } else if (typeValue === "circuit_exercise") {
          exerciseType = "weights"; // Will be set as child
          isGroupHeader = false;
        } else if (typeValue === "amrap") {
          exerciseType = "amrap";
          isGroupHeader = true;
        } else if (typeValue === "amrap_exercise") {
          exerciseType = "bodyweight"; // Will be set as child
          isGroupHeader = false;
        } else if (typeValue === "hiit") {
          exerciseType = "hiit";
          isGroupHeader = false;
        } else if (typeValue === "cardio") {
          exerciseType = "cardio";
        } else if (typeValue === "bodyweight") {
          exerciseType = "bodyweight";
        } else if (typeValue === "mobility") {
          exerciseType = "mobility";
        } else {
          exerciseType = "weights";
        }

        // If no mediaUrl, try to fetch from videos tab in MASTER sheet
        let finalMediaUrl = mediaUrl || undefined;
        if (!finalMediaUrl && name && !isGroupHeader) {
          const fallbackUrl = await fetchMediaFallback(name);
          if (fallbackUrl) {
            finalMediaUrl = fallbackUrl;
          }
        }

        // Mark if this is a child exercise of a group
        const isChildExercise = typeValue === "circuit_exercise" || typeValue === "amrap_exercise";
        
          typeValue,
          isCircuitExercise: typeValue === "circuit_exercise",
          isAmrapExercise: typeValue === "amrap_exercise",
          isChildExercise
        });
        
        const exercise: Exercise = {
          id: String(index + 1),
          name: name || "Unnamed Exercise",
          type: exerciseType,
          notes: notes || undefined,
          mediaUrl: finalMediaUrl,
          isGroupHeader,
          // Add a marker for child exercises
          _isChildExercise: isChildExercise,
        };

        // For group headers, parse special fields
        if (isGroupHeader) {
          if (exerciseType === "circuit") {
            exercise.totalRounds = sets ? parseInt(sets) : 3; // Sets = rounds for circuits
          } else if (exerciseType === "amrap") {
            exercise.timeCap = durationMin ? parseInt(durationMin) : 10; // Duration = time cap for AMRAP
          } else if (exerciseType === "hiit") {
            exercise.totalRounds = sets ? parseInt(sets) : 8; // Sets = intervals for HIIT
            exercise.workRestRatio = notes || "20s/10s"; // Notes = work/rest ratio
            exercise.durationMin = durationMin ? parseInt(durationMin) : undefined;
          }
        } else if (exerciseType === "hiit" || exerciseType === "circuit" || exerciseType === "amrap") {
          // Standalone HIIT/Circuit/AMRAP exercises (not group headers)
          if (exerciseType === "hiit") {
            exercise.totalRounds = sets ? parseInt(sets) : 8; // Sets = intervals for HIIT
            
            // Check if Duration column contains work/rest ratio (e.g., "50/10")
            if (durationMin && durationMin.toString().includes("/")) {
              exercise.workRestRatio = durationMin.toString().trim();
            } else {
              exercise.workRestRatio = notes || "20/10";
              if (durationMin) {
                exercise.durationMin = parseInt(durationMin);
              }
            }
            
              totalRounds: exercise.totalRounds,
              workRestRatio: exercise.workRestRatio,
              durationMin: exercise.durationMin,
              durationColumnValue: durationMin
            });
          } else if (exerciseType === "circuit") {
            exercise.totalRounds = sets ? parseInt(sets) : 3;
            
            // Check if Duration column contains rest info (e.g., "90s rest")
            if (durationMin && isNaN(parseInt(durationMin))) {
              exercise.notes = durationMin.toString().trim();
            } else if (durationMin) {
              exercise.durationMin = parseInt(durationMin);
            }
            
              totalRounds: exercise.totalRounds,
              notes: exercise.notes,
              durationColumnValue: durationMin
            });
          } else if (exerciseType === "amrap") {
            exercise.timeCap = durationMin ? parseInt(durationMin) : 10;
              timeCap: exercise.timeCap,
              durationMinFromSheet: durationMin
            });
          }
          // Also parse reps/kg/distance for standalone grouped exercises if present
          if (sets) exercise.sets = parseInt(sets);
          if (reps) exercise.reps = parseInt(reps);
          if (suggestedKg) exercise.suggestedKg = parseFloat(suggestedKg);
          
          // For child exercises (AMRAP/Circuit), also check Duration column for distance (in km)
          // and Distance column for distance
          if (exerciseType === "bodyweight" || exerciseType === "weights") {
            if (durationMin && !isNaN(parseFloat(durationMin))) {
              exercise.durationMin = parseFloat(durationMin);
            }
            if (targetDistanceKm && !isNaN(parseFloat(targetDistanceKm))) {
              exercise.targetDistanceKm = parseFloat(targetDistanceKm);
            }
          }
        } else {
          // For non-header exercises, parse normally
          
          // ALWAYS parse duration if it exists (for timer)
          if (durationMin) {
            exercise.durationMin = parseInt(durationMin);
          } else {
          }
          
          // ALWAYS parse distance if it exists
          if (targetDistanceKm) {
            exercise.targetDistanceKm = parseFloat(targetDistanceKm);
          }

          if (exercise.type === "cardio") {
            exercise.personalBest = personalBest || undefined;
          } else if (exercise.type === "mobility") {
            // Mobility: no PB
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
        }

        return exercise;
      })
    );
    
    // Second pass: group exercises under their headers
    const groupedExercises: Exercise[] = [];
    let currentGroup: Exercise | null = null;
    let groupChildren: Exercise[] = [];
    
    for (const exercise of parsedExercises) {
        isGroupHeader: exercise.isGroupHeader,
        _isChildExercise: (exercise as any)._isChildExercise,
        startsWithArrow: exercise.name.trim().startsWith("→"),
        currentGroupName: currentGroup?.name
      });
      
      if (exercise.isGroupHeader) {
        // Save previous group if exists
        if (currentGroup && groupChildren.length > 0) {
          currentGroup.exercises = groupChildren;
          groupedExercises.push(currentGroup);
        }
        // Start new group
        currentGroup = exercise;
        groupChildren = [];
      } else if (currentGroup) {
        // Check if this exercise belongs to the current group
        // Only group exercises with names starting with "→" or marked as child exercises
        const isChild = exercise.name.trim().startsWith("→") || 
                        exercise.name.trim().startsWith("- ") ||
                        (exercise as any)._isChildExercise;
        
        
        if (isChild) {
          // Add to current group
          groupChildren.push(exercise);
        } else {
          // Not a child exercise - close current group and add this as standalone
          if (groupChildren.length > 0) {
            currentGroup.exercises = groupChildren;
            groupedExercises.push(currentGroup);
          } else {
          }
          currentGroup = null;
          groupChildren = [];
          groupedExercises.push(exercise);
        }
      } else {
        // Standalone exercise (not part of a group)
        groupedExercises.push(exercise);
      }
    }
    
    // Don't forget the last group
    if (currentGroup && groupChildren.length > 0) {
      currentGroup.exercises = groupChildren;
      groupedExercises.push(currentGroup);
    }
    
      name: ex.name, 
      type: ex.type, 
      isGroupHeader: ex.isGroupHeader,
      hasChildren: !!ex.exercises,
      childCount: ex.exercises?.length || 0
    })));
    
    return groupedExercises;
  } catch (error) {
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
export async function fetchAllPlannedExercises(username: string = getCurrentUser()): Promise<Exercise[]> {
  const userSheet = await getUserSheet(username);
  
  if (!userSheet) {
    return [];
  }

  try {
    const data = await fetchSheetData(userSheet.sheetId, "Plan!A2:K100");
    
    return data
      .filter((row) => row[1]) // Ensure exercise name exists
      .map((row, index) => {
        const [weekday, name, type, sets, reps, suggestedKg, personalBest, durationMin, targetDistanceKm, notes, mediaUrl] = row;
        
        const typeValue = type?.toLowerCase() || "weights";
        let exerciseType: "weights" | "cardio" | "bodyweight" | "mobility" = "weights";
        
        if (typeValue === "cardio") {
          exerciseType = "cardio";
        } else if (typeValue === "bodyweight") {
          exerciseType = "bodyweight";
        } else if (typeValue === "mobility") {
          exerciseType = "mobility";
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

        // ALWAYS parse duration if it exists (for timer)
        if (durationMin) {
          exercise.durationMin = parseInt(durationMin);
        }
        
        // ALWAYS parse distance if it exists
        if (targetDistanceKm) {
          exercise.targetDistanceKm = parseFloat(targetDistanceKm);
        }

        if (exercise.type === "cardio") {
          exercise.personalBest = personalBest || undefined;
        } else if (exercise.type === "mobility") {
          // Mobility: no PB
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
    return [];
  }
}

/**
 * Fetch workout history
 * Expected format: Exercise | Date | Weight | Sets | Reps | Is PB | Duration | Distance | Notes
 */
export async function fetchWorkoutHistory(username: string = getCurrentUser()): Promise<WorkoutLog[]> {
  const userSheet = await getUserSheet(username);
  
  if (!userSheet) {
    return [];
  }

  try {
    const data = await fetchSheetData(userSheet.sheetId, "History!A2:H100");
    
    return data
      .filter((row) => row[0]) // Filter out empty rows
      .map((row, index) => {
        const [exercise, date, weight, sets, reps, isPB, duration, distance, notes] = row;
        
        return {
          id: String(index + 1),
          exercise: exercise || "Unknown",
          date: date || new Date().toLocaleString(),
          weight: weight ? parseFloat(weight) : undefined,
          isPB: isPB?.toLowerCase() === "true" || isPB?.toLowerCase() === "yes",
          duration: duration ? parseInt(duration) : undefined,
          distance: distance ? parseFloat(distance) : undefined,
          notes: notes || undefined,
        };
      })
      .reverse(); // Most recent first
  } catch (error) {
    return [];
  }
}

/**
 * Calculate stats from workout history
 */
export async function fetchUserStats(username: string = getCurrentUser()): Promise<UserStats> {
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
      (sum, log) => sum + (log.weight || 0),
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
 * Log exercise via Vercel serverless function (writes to Google Sheets)
 */
export async function logExercise(
  exerciseName: string,
  data: {
    weight?: number;
    sets?: number;
    reps?: number;
    duration?: number;
    distance?: number;
    notes?: string;
  },
  username: string = getCurrentUser()
): Promise<{ success: boolean; message?: string; isPB?: boolean; oldPB?: number; newPB?: number }> {
  try {
    
    const payload = {
      username,
      exerciseName,
      weight: data.weight,
      sets: data.sets,
      reps: data.reps,
      duration: data.duration,
      distance: data.distance,
      notes: data.notes,
    };
    
    // Call Vercel serverless function
    const response = await fetch('/api/log-workout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    
    // Also save to localStorage as backup (user-specific key)
    const storageKey = `workoutHistory_${username}`;
    const existingLogs = localStorage.getItem(storageKey);
    const logs = existingLogs ? JSON.parse(existingLogs) : [];
    
    const timestamp = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    logs.unshift({
      id: Date.now().toString(),
      username,
      exerciseName,
      timestamp,
      ...data,
      isPB: result.isPB,
    });
    
    if (logs.length > 100) logs.splice(100);
    localStorage.setItem(storageKey, JSON.stringify(logs));
    
    return {
      success: true,
      message: result.message,
      isPB: result.isPB,
      oldPB: result.oldPB,
      newPB: result.newPB,
    };
  } catch (error) {
    
    // Fallback to localStorage only if API fails (user-specific key)
    const storageKey = `workoutHistory_${username}`;
    const existingLogs = localStorage.getItem(storageKey);
    const logs = existingLogs ? JSON.parse(existingLogs) : [];
    
    const timestamp = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    
    logs.unshift({
      id: Date.now().toString(),
      username,
      exerciseName,
      timestamp,
      ...data,
    });
    
    if (logs.length > 100) logs.splice(100);
    localStorage.setItem(storageKey, JSON.stringify(logs));
    
    return {
      success: true,
      message: "Workout saved locally (will sync when online)",
      isPB: false,
    };
  }
}

