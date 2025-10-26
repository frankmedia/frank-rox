import { supabase } from "@/utils/supabaseClient";
import type { Exercise } from "@/types/workout";

/**
 * Fetch the active plan for a client from Supabase
 */
export async function getActivePlan(clientId: string) {
  try {
    const { data: plan, error } = await supabase
      .from("plans")
      .select("id, name, start_date, cycle_days, current_day")
      .eq("client_id", clientId)
      .eq("status", "active")
      .single();

    if (error) throw error;
    return plan;
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
          session_block_items (
            id,
            exercise_id,
            item_order,
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
      for (const session of sessions) {
        const blocks = (session as any).session_blocks || [];
        
        for (const block of blocks) {
          // Sort items by item_order to respect admin ordering
          const items = (block.session_block_items || []).sort((a: any, b: any) => (a.item_order ?? 0) - (b.item_order ?? 0));
          const blockParams = block.parameters || {};
          const blockType = block.block_type?.toLowerCase();
          
          // Check if this is a format group (Circuit, AMRAP - NOT HIIT)
          // HIIT is a standalone exercise type, not a group
          const isFormatGroup = blockParams.format_group === true || !!blockParams.format;
          const format = blockParams.format?.toLowerCase() || blockType;
          
          if (isFormatGroup && (format === 'circuit' || format === 'amrap')) {
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
              } else if (modality === "bodyweight") {
                childType = "bodyweight";
              } else if (modality === "mobility") {
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
              if (childType === "cardio") {
                if (extra.duration) childExercise.durationMin = extra.duration;
                if (extra.distance) childExercise.targetDistanceKm = extra.distance;
              } else if (childType === "mobility") {
                if (extra.duration) childExercise.durationMin = extra.duration;
              } else {
                // weights or bodyweight
                if (extra.sets) childExercise.sets = extra.sets;
                if (extra.reps) childExercise.reps = extra.reps;
                if (childType === "weights" && extra.weight) {
                  childExercise.suggestedKg = extra.weight;
                }
                if (extra.duration) childExercise.durationMin = extra.duration;
                if (extra.distance) childExercise.targetDistanceKm = extra.distance;
              }
              
              childExercises.push(childExercise);
            }
            
            // Create the parent/header exercise
            exercises.push({
              id: String(block.id),
              name: block.title || `${format.toUpperCase()}: Workout`,
              type: format as any, // "circuit", "amrap", or "hiit"
              isGroupHeader: true,
              exercises: childExercises,
              totalRounds: blockParams.rounds || 3,
              timeCap: blockParams.time_cap || undefined,
              workRestRatio: blockParams.work && blockParams.rest ? `${blockParams.work}s/${blockParams.rest}s` : undefined,
              notes: blockParams.notes || block.title || undefined,
            });
            
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
              let exerciseType: "weights" | "cardio" | "bodyweight" | "mobility" | "running" | "hiit" | "circuit" | "amrap" | "rehab" | "intro" = "weights";
              const modality = ex.modality?.toLowerCase();
              
              if (modality === "intro") {
                exerciseType = "intro";
              } else if (modality === "cardio" || modality === "running") {
                exerciseType = "cardio";
              } else if (modality === "bodyweight") {
                exerciseType = "bodyweight";
              } else if (modality === "mobility") {
                exerciseType = "mobility";
              } else if (modality === "rehab") {
                exerciseType = "rehab";
              } else if (modality === "strength") {
                exerciseType = "weights";
              }

              const exerciseObj = {
                id: String(item.id), // USE session_block_items.id, NOT exercises.id!
                name: ex.name,
                type: exerciseType,
                notes: ex.notes || undefined,
                mediaUrl: ex.media?.youtube || ex.media?.video || undefined,
                
                // Extract workout parameters from extra (matching Google Sheets format)
                sets: extra.sets || undefined,
                reps: extra.reps || undefined,
                suggestedKg: extra.weight || undefined,
                durationMin: extra.duration || undefined,
                targetDistanceKm: extra.distance || undefined,
                
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

    // Find today's day based on day_index
    const currentDayIndex = currentDayNumber - 1; // Convert to 0-based index
    const todayDay = days.find(d => d.day_index === currentDayIndex);
    
    if (!todayDay) {
      console.log("❌ Day not found for index:", currentDayIndex, "- Available days:", days.map(d => d.day_index));
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

