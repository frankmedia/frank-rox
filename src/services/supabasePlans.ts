import { supabase } from "@/utils/supabaseClient";
import type { Exercise } from "@/types/workout";

/**
 * Helper function to parse weight values that might contain "kg" suffix
 * @param value - Weight value (could be number, string, or string with "kg")
 * @returns Parsed number or undefined
 */
function parseWeight(value: any): number | undefined {
  if (value === null || value === undefined) return undefined;
  
  // If it's already a number, return it
  if (typeof value === 'number') return value > 0 ? value : undefined;
  
  // If it's a string, try to parse it
  if (typeof value === 'string') {
    // Remove "kg" suffix if present (case insensitive)
    const cleanValue = value.replace(/kg$/i, '').trim();
    const parsed = parseFloat(cleanValue);
    return (!isNaN(parsed) && parsed > 0) ? parsed : undefined;
  }
  
  return undefined;
}

/**
 * Fetch the active plan for a client from Supabase
 */
export async function getActivePlan(clientId: string) {
  try {
    const { data: plans, error } = await supabase
      .from("plans")
      .select("id, name, start_date, cycle_days, current_day")
      .eq("client_id", clientId)
      .eq("status", "active")
      .order("start_date", { ascending: false })
      .limit(1);

    if (error) throw error;
    return plans && plans.length > 0 ? plans[0] : null;
  } catch (err) {
    console.error("Error fetching active plan:", err);
    return null;
  }
}

/**
 * Fetch all plan days for a plan
 */
export async function getPlanDays(planId: string) {
  try {
    const { data: days, error } = await supabase
      .from("plan_days")
      .select("*")
      .eq("plan_id", planId)
      .order("day_index");

    if (error) throw error;
    return days || [];
  } catch (err) {
    console.error("Error fetching plan days:", err);
    return [];
  }
}

/**
 * Fetch exercises for a specific day
 * Returns exercises in the same format as Google Sheets for compatibility
 */
export async function getDayExercises(dayId: string): Promise<Exercise[]> {
  try {
    // Fetch all sessions for this day
    const { data: sessions, error: sessionsError } = await supabase
      .from("sessions")
      .select(`
        id,
        name,
        order_index,
        session_blocks (
          id,
          block_type,
          title,
          parameters,
          rounds,
          time_cap_sec,
          work_sec,
          rest_sec,
          rest_between_rounds_s,
          intensity,
          order_index,
          session_block_items (
            id,
            exercise_id,
            item_order,
            sets,
            reps,
            duration_sec,
            distance_m,
            rest_sec,
            notes,
            extra,
            exercises (
              id,
              name,
              notes,
              modality,
              tags,
              media
            )
          )
        )
      `)
      .eq("plan_day_id", dayId)
      .order("order_index");

    if (sessionsError) throw sessionsError;

    // Transform Supabase data to Exercise format
    const exercises: Exercise[] = [];
    
    if (sessions) {
      console.log(`🔧 Processing ${sessions.length} sessions`);
      for (const session of sessions) {
        const blocks = (session as any).session_blocks || [];
        console.log(`📦 Session "${session.name}": ${blocks.length} blocks`);
        // Ensure blocks are processed in defined order
        blocks.sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0));
        
        for (const block of blocks) {
          // Sort items by item_order to respect admin ordering
          const items = (block.session_block_items || []).sort((a: any, b: any) => (a.item_order ?? 0) - (b.item_order ?? 0));
          const blockParams = block.parameters || {};
          const blockType = block.block_type?.toLowerCase();
          
          // Check if this is a format group (Circuit, AMRAP, Simulation - NOT HIIT)
          // HIIT is a standalone exercise type, not a group
          // Also recognize by block_type directly (for blocks created without parameters.format)
          const isFormatGroup = blockParams.format_group === true || !!blockParams.format || (blockType === 'circuit' || blockType === 'amrap' || blockType === 'simulation');
          const format = blockParams.format?.toLowerCase() || blockType;
          
          console.log(`🔍 Block check:`, { blockType, format, isFormatGroup, title: block.title, items: items.length });
          
          if (isFormatGroup && (format === 'circuit' || format === 'amrap' || format === 'simulation')) {
            // Create a grouped exercise (header + children)
            const childExercises: any[] = [];
            
            for (const item of items) {
              const ex = item.exercises;
              if (!ex) continue;
              
              const extra = item.extra || {};
              
              // Map modality for child exercise
              let childType: "weights" | "cardio" | "bodyweight" | "mobility" = "weights";
              const modality = ex.modality?.toLowerCase();
              
              if (modality === "cardio" || modality === "running") {
                childType = "cardio";
              } else if (modality === "erg") {
                childType = "cardio";
              } else if (modality === "bodyweight") {
                childType = "bodyweight";
              } else if (modality === "mobility" || modality === "core") {
                childType = "mobility";
              } else if (modality === "strength") {
                childType = "weights";
              }
              
              // Build child exercise with all parameters from extra
              const childExercise: any = {
                id: String(item.id), // USE session_block_items.id for updating!
                name: ex.name,
                type: childType,
                notes: ex.notes || undefined,
                mediaUrl: ex.media?.youtube || ex.media?.video || undefined,
                _isChildExercise: true, // Mark as child so it's not rendered separately
              };
              
              // Add workout parameters based on type
              // Prefer database columns over extra object
              if (childType === "cardio") {
                // Use duration_sec column (stored as minutes), fallback to extra
                if (item.duration_sec) {
                  childExercise.durationMin = item.duration_sec;
                } else if (extra.duration) {
                  childExercise.durationMin = extra.duration;
                }
                
                // Use distance_m column (convert to km), fallback to extra
                if (item.distance_m) {
                  const distanceKm = item.distance_m / 1000;
                  if (distanceKm >= 0.01 && distanceKm <= 100) {
                    childExercise.targetDistanceKm = distanceKm;
                    childExercise.distance = distanceKm;
                  }
                } else if (extra.distance && extra.distance >= 0.01 && extra.distance <= 100) {
                  childExercise.targetDistanceKm = extra.distance;
                  childExercise.distance = extra.distance;
                }
              } else if (childType === "mobility") {
                // Mobility/core exercises can have reps too (e.g., sit-ups, planks)
                childExercise.sets = item.sets || extra.sets;
                childExercise.reps = item.reps || extra.reps;
                if (item.duration_sec) {
                  childExercise.durationMin = item.duration_sec;
                } else if (extra.duration) {
                  childExercise.durationMin = extra.duration;
                }
              } else {
                // weights or bodyweight
                childExercise.sets = item.sets || extra.sets;
                childExercise.reps = item.reps || extra.reps;
                if (extra.weight) {
                  childExercise.weight = extra.weight; // For SimulationWorkout
                  if (childType === "weights" && typeof extra.weight === 'number') {
                    childExercise.suggestedKg = extra.weight;
                  }
                }
                if (item.duration_sec) {
                  childExercise.durationMin = item.duration_sec;
                } else if (extra.duration) {
                  childExercise.durationMin = extra.duration;
                }
                
                // Use distance_m column (convert to km), fallback to extra
                if (item.distance_m) {
                  const distanceKm = item.distance_m / 1000;
                  if (distanceKm >= 0.01 && distanceKm <= 100) {
                    childExercise.targetDistanceKm = distanceKm;
                    childExercise.distance = distanceKm;
                  }
                } else if (extra.distance && extra.distance >= 0.01 && extra.distance <= 100) {
                  childExercise.targetDistanceKm = extra.distance;
                  childExercise.distance = extra.distance;
                }
              }
              
              childExercises.push(childExercise);
            }
            
            // Create the parent/header exercise
            // Only use work/rest if explicitly set (not null) - don't apply defaults
            const workSec = block.work_sec ?? blockParams.work ?? null;
            const restSec = block.rest_sec ?? blockParams.rest ?? null;
            const restBetweenRounds = block.rest_between_rounds_s ?? blockParams.rest_between_rounds ?? null;
            
            const parentExercise = {
              id: String(block.id),
              name: block.title || `${format.toUpperCase()}: Workout`,
              type: format as any, // "circuit", "amrap", "simulation", or "hiit"
              isGroupHeader: true,
              exercises: childExercises,
              totalRounds: block.rounds || blockParams.rounds || (format === 'simulation' ? 1 : 3),
              timeCap: block.time_cap_sec || blockParams.time_cap || undefined,
              workRestRatio: (workSec != null && restSec != null) ? `${workSec}s/${restSec}s` : undefined,
              work_sec: workSec,
              rest_sec: restSec,
              rest_between_rounds_s: restBetweenRounds,
              notes: blockParams.notes || block.title || undefined,
            };
            
            console.log(`📦 Created ${format} block:`, {
              name: parentExercise.name,
              exercises: childExercises.length,
              work_sec: workSec,
              rest_sec: restSec,
              rounds: parentExercise.totalRounds,
              rest_between_rounds: restBetweenRounds,
              children: childExercises.map(c => ({ name: c.name, distance: c.targetDistanceKm }))
            });
            
            exercises.push(parentExercise);
            
          } else if (isFormatGroup && format === 'hiit') {
            // HIIT is a standalone exercise (not a group), but uses block parameters
            // Only process the first item (HIIT should have one exercise per block)
            const item = items[0];
            if (item && item.exercises) {
              const ex = item.exercises;
              const extra = item.extra || {};
              
              // Build work/rest ratio from block parameters
              let workRestRatio = undefined;
              if (blockParams.work && blockParams.rest) {
                workRestRatio = `${blockParams.work}/${blockParams.rest}`;
              } else if (blockParams.work_sec && blockParams.rest_sec) {
                workRestRatio = `${blockParams.work_sec}/${blockParams.rest_sec}`;
              }
              
              exercises.push({
                id: String(item.id), // USE session_block_items.id, NOT exercises.id!
                name: ex.name,
                type: "hiit", // Always HIIT type
                notes: ex.notes || blockParams.notes || block.title || undefined,
                mediaUrl: ex.media?.youtube || ex.media?.video || undefined,
                
                // HIIT-specific parameters
                totalRounds: blockParams.rounds || extra.rounds || 8,
                workRestRatio: workRestRatio || extra.workRestRatio || "30/60",
                durationMin: extra.duration || undefined,
              });
            }
          } else {
            // Regular standalone exercises (not in a group)
            for (const item of items) {
              const ex = item.exercises;
              if (!ex) continue;

              const extra = item.extra || {};

              // Map modality to ExerciseType
              let exerciseType: "weights" | "cardio" | "bodyweight" | "mobility" | "running" | "hiit" | "circuit" | "amrap" | "rehab" | "intro" | "simulation" = "weights";
              const modality = ex.modality?.toLowerCase();
              
              if (modality === "intro") {
                exerciseType = "intro";
              } else if (modality === "cardio" || modality === "running" || modality === "erg") {
                exerciseType = "cardio";
              } else if (modality === "bodyweight") {
                exerciseType = "bodyweight";
              } else if (modality === "mobility" || modality === "core") {
                exerciseType = "mobility";
              } else if (modality === "rehab") {
                exerciseType = "rehab";
              } else if (modality === "strength") {
                exerciseType = "weights";
              }

              // Prefer database columns over extra object
              let durationMin = undefined;
              if (item.duration_sec) {
                durationMin = item.duration_sec; // Already stored as minutes
              } else if (extra.duration) {
                durationMin = extra.duration;
              }

              let targetDistanceKm = undefined;
              if (item.distance_m) {
                const distanceKm = item.distance_m / 1000;
                if (distanceKm >= 0.01 && distanceKm <= 100) {
                  targetDistanceKm = distanceKm;
                }
              } else if (extra.distance && extra.distance >= 0.01 && extra.distance <= 100) {
                targetDistanceKm = extra.distance;
              }

              const exerciseObj = {
                id: String(item.id), // USE session_block_items.id, NOT exercises.id!
                name: extra.custom_name || ex.name, // Use custom name if set, otherwise use base exercise name
                type: exerciseType,
                notes: item.notes || ex.notes || undefined,
                mediaUrl: ex.media?.youtube || ex.media?.video || undefined,
                
                // Extract workout parameters - prefer DB columns over extra
                sets: item.sets || extra.sets || undefined,
                reps: item.reps || extra.reps || undefined,
                suggestedKg: parseWeight(extra.weight), // Parse weight to handle "kg" suffix
                durationMin,
                targetDistanceKm,
                
                // Format-specific parameters (for HIIT/Circuit/AMRAP)
                workRestRatio: extra.workRestRatio || blockParams.workRestRatio || undefined,
                totalRounds: extra.rounds || blockParams.rounds || undefined,
                timeCap: blockParams.time_cap || undefined,
              };
              
              console.log('📦 Loading exercise from DB:', {
                name: ex.name,
                exercise_id: ex.id,
                session_block_item_id: item.id,
                extra,
                mapped: {
                  sets: exerciseObj.sets,
                  reps: exerciseObj.reps,
                  suggestedKg: exerciseObj.suggestedKg,
                  durationMin: exerciseObj.durationMin,
                  targetDistanceKm: exerciseObj.targetDistanceKm
                }
              });
              
              exercises.push(exerciseObj);
            }
          }
        }
      }
    }

    // Deduplicate exercises by ID to prevent duplicate keys in React
    const uniqueExercises = exercises.reduce((acc: Exercise[], exercise) => {
      if (!acc.some(ex => ex.id === exercise.id)) {
        acc.push(exercise);
      }
      return acc;
    }, []);

    return uniqueExercises;
  } catch (err) {
    console.error("Error fetching day exercises:", err);
    return [];
  }
}

/**
 * Fetch exercises for today based on current training day
 * Uses localStorage training day if available, otherwise falls back to plan.current_day
 */
export async function getTodayExercises(clientId: string): Promise<Exercise[]> {
  try {
    // Get active plan
    const plan = await getActivePlan(clientId);
    if (!plan) {
      console.log("❌ No active plan found for clientId:", clientId);
      return [];
    }

    console.log("📋 Found active plan:", plan.name, "- ID:", plan.id);

    // Get plan days
    const days = await getPlanDays(plan.id);
    if (days.length === 0) {
      console.log("❌ No days found in plan");
      return [];
    }

    console.log("📅 Found", days.length, "days in plan");

    // Get current training day from localStorage (same as Sheets logic)
    let currentDayNumber = plan.current_day || 1;
    
    try {
      const userStr = localStorage.getItem("frank_rock_user");
      if (userStr) {
        const user = JSON.parse(userStr);
        const userKey = `currentTrainingDay_${user.username}`;
        const storedDay = localStorage.getItem(userKey);
        if (storedDay) {
          currentDayNumber = parseInt(storedDay);
          console.log("📍 Using training day from localStorage:", currentDayNumber);
        }
      }
    } catch (e) {
      console.log("⚠️ Could not read localStorage, using plan.current_day:", currentDayNumber);
    }

    // Find today's day based on day_index (day_index is 1-based: 1, 2, 3...)
    const todayDay = days.find(d => d.day_index === currentDayNumber);
    
    if (!todayDay) {
      console.log("❌ Day not found for day_index:", currentDayNumber, "- Available days:", days.map(d => d.day_index));
      return [];
    }

    console.log("✅ Found today's day:", todayDay.label || `Day ${currentDayNumber}`, "- ID:", todayDay.id);

    // Fetch exercises for today
    const exercises = await getDayExercises(todayDay.id);
    console.log("📦 Fetched", exercises.length, "exercises for today");
    console.log("📋 Exercise types:", exercises.map(ex => ({ name: ex.name, type: ex.type })));
    
    // If the day has a description, add it as an intro card at the beginning
    if (todayDay.description) {
      exercises.unshift({
        id: `day-intro-${todayDay.id}`,
        name: todayDay.label || `Day ${currentDayNumber}`,
        type: "intro",
        notes: todayDay.description,
      } as any);
      console.log("📝 Added day description as intro card:", todayDay.description);
    }
    
    return exercises;
  } catch (err) {
    console.error("❌ Error fetching today's exercises:", err);
    return [];
  }
}

/**
 * Get all days summary for the overview page
 */
export async function getAllDaysSummary(clientId: string) {
  try {
    const plan = await getActivePlan(clientId);
    if (!plan) return [];

    const days = await getPlanDays(plan.id);
    
    // Fetch exercise counts for each day
    const daysSummary = await Promise.all(
      days.map(async (day) => {
        const exercises = await getDayExercises(day.id);
        
        // Group by type (not modality - exercises have 'type' field)
        const modalities = exercises.reduce((acc, ex) => {
          const type = ex.type || 'weights';
          if (!acc[type]) {
            acc[type] = 0;
          }
          acc[type]++;
          return acc;
        }, {} as Record<string, number>);

        return {
          dayNumber: day.day_index + 1,
          label: day.label || `Day ${day.day_index + 1}`,
          isRest: day.is_rest || false,
          exerciseCount: exercises.length,
          modalities,
          status: day.status || "pending",
        };
      })
    );

    return daysSummary;
  } catch (err) {
    console.error("Error fetching days summary:", err);
    return [];
  }
}

