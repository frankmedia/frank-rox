/**
 * Programme to Database Service
 * 
 * Converts the generated programme (from ProgrammeBuilder) into actual
 * database records (plans, plan_days, sessions, blocks, items).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createRunSession, type RunSessionOptions } from "./generators/runGenerator";

type SessionBlock = {
  day: string;
  type: "run" | "strength" | "cardio" | "recovery";
  title: string;
  distance?: string;
  pace?: string;
  effort: "easy" | "moderate" | "hard";
  detail?: string;
};

type Programme = {
  sessions: SessionBlock[];
  preferences: any;
  generatedAt: string;
  blockNumber: number;
  focus: "base" | "build" | "race-prep";
};

/**
 * Create a plan in the database and generate all workouts
 */
export async function createPlanInDatabase(
  supabase: SupabaseClient,
  clientId: string,
  programme: Programme
): Promise<{ planId: string; warnings: string[] }> {
  console.log("🚀 createPlanInDatabase called with:", {
    clientId,
    blockNumber: programme.blockNumber,
    focus: programme.focus,
    sessionsCount: programme.sessions.length,
  });

  const warnings: string[] = [];

  try {
    // 0. Delete any existing active plans for this user (for testing)
    console.log("🗑️ Checking for existing active plans...");
    const { data: existingPlans } = await supabase
      .from("plans")
      .select("id")
      .eq("client_id", clientId)
      .eq("status", "active");
    
    if (existingPlans && existingPlans.length > 0) {
      console.log(`🗑️ Deleting ${existingPlans.length} existing active plan(s)...`);
      for (const plan of existingPlans) {
        // Delete plan_days first (foreign key constraint)
        await supabase.from("plan_days").delete().eq("plan_id", plan.id);
        // Then delete the plan
        await supabase.from("plans").delete().eq("id", plan.id);
      }
      console.log("✅ Existing plans deleted");
    }

    // 1. Create the plan
    console.log("📝 Creating new plan in database...");
    const { data: plan, error: planError } = await supabase
      .from("plans")
      .insert({
        client_id: clientId,
        name: `Block ${programme.blockNumber} - ${programme.focus.charAt(0).toUpperCase() + programme.focus.slice(1)} Phase`,
        start_date: new Date().toISOString(),
        cycle_days: 14, // 2-week block
        current_day: 1,
        status: "active",
      })
      .select()
      .single();

    if (planError || !plan) {
      console.error("❌ Failed to create plan:", planError);
      throw new Error(`Failed to create plan: ${planError?.message || "Unknown error"}`);
    }

    console.log("✅ Plan created:", plan.id, plan);

    // 2. Create plan_days for 14 days (2 weeks)
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const planDays: any[] = [];

    for (let i = 0; i < 14; i++) {
      const dayDate = new Date();
      dayDate.setDate(dayDate.getDate() + i);
      const dayName = dayNames[i % 7];

      console.log(`Creating plan day ${i + 1}:`, {
        plan_id: plan.id,
        day_index: i + 1,
        label: `Day ${i + 1}`,
        description: dayName,
      });

      const { data: planDay, error: dayError } = await supabase
        .from("plan_days")
        .insert({
          plan_id: plan.id,
          day_index: i + 1,
          label: `Day ${i + 1}`,
          description: dayName, // Monday, Tuesday, etc.
          is_rest: false, // Will be updated later for rest days
          notes: null,
        })
        .select()
        .single();

      if (dayError || !planDay) {
        console.error(`❌ Failed to create day ${i + 1}:`, dayError);
        warnings.push(`Failed to create day ${i + 1}: ${dayError?.message}`);
        continue;
      }

      console.log(`✅ Created plan day ${i + 1}:`, planDay);
      planDays.push({ ...planDay, dayName }); // Store dayName for matching
    }

    console.log(`✅ Created ${planDays.length} plan days out of 14`);

    // 3. Mark rest days (days without sessions in Week 1)
    const sessionDays = new Set(programme.sessions.map(s => s.day));
    const week1Days = planDays.slice(0, 7); // First 7 days only
    
    for (const planDay of week1Days) {
      if (!sessionDays.has(planDay.dayName)) {
        // Mark as rest day
        console.log(`🛌 Marking ${planDay.dayName} as rest day`);
        await supabase
          .from("plan_days")
          .update({ 
            is_rest: true,
            description: "Rest & Recovery"
          })
          .eq("id", planDay.id);
      }
    }

    // 4. Generate workouts for each session
    console.log(`📋 Programme has ${programme.sessions.length} sessions:`);
    programme.sessions.forEach((s: any, i: number) => {
      console.log(`  ${i + 1}. ${s.day}: ${s.title} (${s.type})`);
    });
    
    for (const session of programme.sessions) {
      // Find the plan_day for this session (match by dayName we stored)
      const planDay = planDays.find(pd => pd.dayName === session.day);
      if (!planDay) {
        console.error(`❌ Could not find plan day for ${session.day}`);
        warnings.push(`Could not find plan day for ${session.day}`);
        continue;
      }

      console.log(`🏋️ Generating ${session.type} workout for ${session.day} (plan_day ${planDay.day_index})`);

      // Generate workout based on session type
      try {
        if (session.type === "run") {
          await generateRunWorkout(supabase, planDay.id, session, warnings);
        } else if (session.type === "strength") {
          await generateStrengthWorkout(supabase, planDay.id, session, warnings);
        } else if (session.type === "cardio") {
          await generateCardioWorkout(supabase, planDay.id, session, warnings);
        } else if (session.type === "recovery") {
          await generateRecoveryWorkout(supabase, planDay.id, session, warnings);
        }
        console.log(`✅ Generated ${session.type} workout for ${session.day}`);
      } catch (error: any) {
        console.error(`❌ Error generating ${session.type} workout for ${session.day}:`, error);
        warnings.push(`Error generating ${session.type} workout for ${session.day}: ${error.message}`);
      }
    }

    console.log("✅ All workouts generated");

    // 4. Duplicate Week 1 sessions to Week 2 with progressive overload
    await duplicateWeekWithProgression(supabase, planDays, programme, warnings);

    return { planId: plan.id, warnings };
  } catch (error: any) {
    throw new Error(`Failed to create programme in database: ${error.message}`);
  }
}

/**
 * Generate a running workout
 */
async function generateRunWorkout(
  supabase: SupabaseClient,
  planDayId: string,
  session: SessionBlock,
  warnings: string[]
) {
  let options: RunSessionOptions;

  if (session.title.includes("Long Run")) {
    options = {
      sessionType: "long_run",
      distance: session.distance || "8-10km",
      pace: session.pace || "Zone 2",
      effort: session.effort,
      notes: session.detail,
    };
  } else if (session.title.includes("Intervals")) {
    // Parse "6×500m" from distance
    const match = session.distance?.match(/(\d+)×(\d+\w+)/);
    const reps = match ? parseInt(match[1]) : 6;
    const repDistance = match ? match[2] : "500m";

    options = {
      sessionType: "intervals",
      reps,
      repDistance,
      restDuration: "90s",
      pace: session.pace || "Race pace",
      effort: session.effort,
      notes: session.detail,
    };
  } else if (session.title.includes("Tempo")) {
    options = {
      sessionType: "tempo",
      distance: session.distance || "4-6km",
      pace: session.pace || "Steady",
      effort: session.effort,
      notes: session.detail,
    };
  } else if (session.title.includes("Hill")) {
    const match = session.distance?.match(/(\d+)×(\d+\w+)/);
    const reps = match ? parseInt(match[1]) : 6;
    const repDistance = match ? match[2] : "200m";

    options = {
      sessionType: "hills",
      reps,
      repDistance,
      hillGradient: "5-8%",
      restDuration: "Jog down",
      effort: session.effort,
      notes: session.detail,
    };
  } else if (session.title.includes("Recovery")) {
    options = {
      sessionType: "recovery",
      distance: session.distance || "3-4km",
      pace: "Very easy",
      effort: "easy",
      notes: session.detail,
    };
  } else {
    // Default to long run
    options = {
      sessionType: "long_run",
      distance: session.distance || "6km",
      pace: session.pace || "Easy",
      effort: session.effort,
      notes: session.detail,
    };
  }

  const result = await createRunSession(supabase, planDayId, options);
  warnings.push(...result.warnings);
}

/**
 * Generate a strength workout
 */
async function generateStrengthWorkout(
  supabase: SupabaseClient,
  planDayId: string,
  session: SessionBlock,
  warnings: string[]
) {
  console.log(`💪 Generating strength workout: ${session.title}`);
  
  // Get the plan to find the client_id
  const { data: planDay } = await supabase
    .from("plan_days")
    .select("plan_id, plans!inner(client_id)")
    .eq("id", planDayId)
    .single();

  let onboardingData: any = null;
  let strengthData = {
    bench5rm: 40, // defaults
    squat5rm: 60,
    deadlift5rm: 80,
    ohp5rm: 20,
  };

  // Fetch onboarding data if available
  if (planDay?.plans?.client_id) {
    const { data: client } = await supabase
      .from("clients")
      .select("onboarding_answers")
      .eq("id", planDay.plans.client_id)
      .single();

    if (client?.onboarding_answers) {
      onboardingData = client.onboarding_answers;
      console.log("📊 Onboarding data:", onboardingData);

      // Parse strength data from onboarding
      if (onboardingData.bench5rm) {
        strengthData.bench5rm = parseWeight(onboardingData.bench5rm);
      }
      if (onboardingData.squat5rm) {
        strengthData.squat5rm = parseWeight(onboardingData.squat5rm);
      }
      if (onboardingData.deadlift5rm) {
        strengthData.deadlift5rm = parseWeight(onboardingData.deadlift5rm);
      }
      if (onboardingData.ohp5rm) {
        strengthData.ohp5rm = parseWeight(onboardingData.ohp5rm);
      }
    }
  }

  console.log("💪 Strength data:", strengthData);

  // Helper: Parse weight from onboarding (e.g., "80", "120+", "Not sure")
  function parseWeight(value: string): number {
    if (!value || value === "Not sure") return 40; // default moderate weight
    const num = parseInt(value.replace("+", ""));
    return isNaN(num) ? 40 : num;
  }

  // Helper: Calculate 1RM from 5RM
  function calculate1RM(fiveRM: number): number {
    return Math.round(fiveRM * 1.15);
  }

  // Helper: Calculate working weight based on percentage of 1RM
  function calculateWeight(fiveRM: number, percentage: number): number {
    const oneRM = calculate1RM(fiveRM);
    return Math.round(oneRM * percentage);
  }

  // Determine the split type from the title
  let split: "lower" | "upper" | "full_body" = "full_body";
  if (session.title.toLowerCase().includes("lower")) {
    split = "lower";
  } else if (session.title.toLowerCase().includes("upper")) {
    split = "upper";
  }
  
  // Create the session
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name: session.title,
      order_index: 1,
    })
    .select()
    .single();

  if (sessionError || !sessionData) {
    warnings.push(`Failed to create strength session: ${sessionError?.message}`);
    return;
  }

  // Helper function to find exercise by name
  const findExercise = async (names: string[]) => {
    for (const name of names) {
      const { data } = await supabase
        .from("exercises")
        .select("id, name")
        .ilike("name", `%${name}%`)
        .limit(1)
        .single();
      if (data) return data;
    }
    return null;
  };

  try {
    if (split === "lower") {
      // LOWER BODY WORKOUT
      
      // Warm-up Block
      const { data: warmupBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Warm-up",
          rounds: 1,
          block_order: 0,
        })
        .select()
        .single();

      if (warmupBlock) {
        // Goblet Squat warm-up
        const gobletSquat = await findExercise(["Goblet Squat", "Dumbbell Goblet Squat"]);
        if (gobletSquat) {
          const warmupWeight = Math.round(strengthData.squat5rm * 0.3); // 30% of 5RM for warm-up
          await supabase.from("session_block_items").insert({
            block_id: warmupBlock.id,
            exercise_id: gobletSquat.id,
            item_order: 0,
            sets: 2,
            reps: 10,
            weight_kg: warmupWeight,
            notes: "Warm-up - Light weight, focus on form and depth",
          });
        }
      }

      // Main Work Block
      const { data: mainBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Lower Body Strength",
          rounds: 1,
          block_order: 1,
        })
        .select()
        .single();

      if (mainBlock) {
        let order = 0;
        
        // 1. Back Squat or Squat - STRENGTH (4×6 @ 80%)
        const squat = await findExercise(["Squat", "Back Squat", "Barbell Squat"]);
        if (squat) {
          const squatWeight = calculateWeight(strengthData.squat5rm, 0.80); // 80% of 1RM
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: squat.id,
            item_order: order++,
            sets: 4,
            reps: 6,
            weight_kg: squatWeight,
            notes: "Strength - 80% 1RM, focus on depth and explosive drive",
          });
        }

        // 2. Bulgarian Split Squat - HYPERTROPHY (3×8 @ 70%)
        const bulgarian = await findExercise(["Rear-Foot Elevated Split Squat", "Split Squat", "DB Split Squat"]);
        if (bulgarian) {
          const bulgarianWeight = calculateWeight(strengthData.squat5rm, 0.70); // 70% of squat 1RM
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: bulgarian.id,
            item_order: order++,
            sets: 3,
            reps: 8,
            weight_kg: Math.round(bulgarianWeight * 0.6), // Split between legs, so lighter
            notes: "Hypertrophy - Each leg, controlled 3-0-1 tempo, maintain upright torso",
          });
        }

        // 3. Romanian Deadlift - HYPERTROPHY (3×10 @ 70%)
        const rdl = await findExercise(["Romanian Deadlift", "RDL", "DB Romanian Deadlift"]);
        if (rdl) {
          const rdlWeight = calculateWeight(strengthData.deadlift5rm, 0.70); // 70% of deadlift 1RM
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: rdl.id,
            item_order: order++,
            sets: 3,
            reps: 10,
            weight_kg: rdlWeight,
            notes: "Hypertrophy - Feel the hamstring stretch, keep bar close to legs",
          });
        }

        // 4. Leg Press - ENDURANCE (3×12 @ 65%)
        const legPress = await findExercise(["Leg Press"]);
        if (legPress) {
          const legPressWeight = calculateWeight(strengthData.squat5rm, 0.65); // 65% of squat 1RM
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: legPress.id,
            item_order: order++,
            sets: 3,
            reps: 12,
            weight_kg: Math.round(legPressWeight * 1.5), // Leg press typically heavier
            notes: "Endurance - Full ROM, don't lock knees at top",
          });
        }
      }

      // Core Finisher Block
      const { data: coreBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Core Finisher",
          rounds: 3,
          block_order: 2,
        })
        .select()
        .single();

      if (coreBlock) {
        // Plank
        const plank = await findExercise(["Plank"]);
        if (plank) {
          await supabase.from("session_block_items").insert({
            block_id: coreBlock.id,
            exercise_id: plank.id,
            item_order: 0,
            duration_sec: 45,
            notes: "Hold strong position",
          });
        }
      }

    } else if (split === "upper") {
      // UPPER BODY WORKOUT
      
      // Warm-up Block
      const { data: warmupBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Warm-up",
          rounds: 1,
          block_order: 0,
        })
        .select()
        .single();

      if (warmupBlock) {
        // Band Pull-Aparts
        const bandPull = await findExercise(["Band Pull-Apart", "Band Pull Apart"]);
        if (bandPull) {
          await supabase.from("session_block_items").insert({
            block_id: warmupBlock.id,
            exercise_id: bandPull.id,
            item_order: 0,
            sets: 2,
            reps: 15,
            notes: "Warm-up - Light resistance, scapular retraction focus",
          });
        }
      }

      // Main Work Block
      const { data: mainBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Upper Body Strength",
          rounds: 1,
          block_order: 1,
        })
        .select()
        .single();

      if (mainBlock) {
        let order = 0;
        
        // 1. Bench Press - STRENGTH (4×6 @ 80%)
        const bench = await findExercise(["Bench Press", "DB Chest Press", "Chest Press"]);
        if (bench) {
          const benchWeight = calculateWeight(strengthData.bench5rm, 0.80); // 80% of 1RM
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: bench.id,
            item_order: order++,
            sets: 4,
            reps: 6,
            weight_kg: benchWeight,
            notes: "Strength - 80% 1RM, control the descent (3s), explosive press",
          });
        }

        // 2. Bent Over Row - STRENGTH/HYPERTROPHY (4×8 @ 75%)
        const row = await findExercise(["Bent Over Row", "DB Bent-Over Row", "Single Arm DB Row"]);
        if (row) {
          const rowWeight = calculateWeight(strengthData.bench5rm, 0.75); // 75% of bench 1RM (approximate)
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: row.id,
            item_order: order++,
            sets: 4,
            reps: 8,
            weight_kg: Math.round(rowWeight * 0.9), // Rows typically slightly lighter than bench
            notes: "Strength/Hypertrophy - Pull to ribs, squeeze scapulae at top, 2s hold",
          });
        }

        // 3. DB Shoulder Press - HYPERTROPHY (3×10 @ 70%)
        const shoulderPress = await findExercise(["DB Shoulder Press", "Shoulder Press", "DB Overhead Press"]);
        if (shoulderPress) {
          const shoulderWeight = calculateWeight(strengthData.ohp5rm, 0.70); // 70% of OHP 1RM
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: shoulderPress.id,
            item_order: order++,
            sets: 3,
            reps: 10,
            weight_kg: shoulderWeight,
            notes: "Hypertrophy - Full ROM, controlled tempo, avoid arching back",
          });
        }

        // 4. Lat Pulldown - HYPERTROPHY (3×10 @ 70%)
        const lat = await findExercise(["Lat Pulldown", "Wide Grip Pull Up", "Pull Up"]);
        if (lat) {
          const latWeight = calculateWeight(strengthData.bench5rm, 0.70); // 70% of bench 1RM (approximate)
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: lat.id,
            item_order: order++,
            sets: 3,
            reps: 10,
            weight_kg: Math.round(latWeight * 0.85), // Lats typically lighter
            notes: "Hypertrophy - Pull to upper chest, squeeze lats, slow eccentric",
          });
        }
      }

      // Accessory Block
      const { data: accessoryBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Accessory Work",
          rounds: 1,
          block_order: 2,
        })
        .select()
        .single();

      if (accessoryBlock) {
        let order = 0;
        
        // DB Bicep Curl - ENDURANCE (3×12 @ 60%)
        const curl = await findExercise(["DB Bicep Curl", "Bicep Curl"]);
        if (curl) {
          const bicepWeight = calculateWeight(strengthData.bench5rm, 0.60); // 60% of bench 1RM
          await supabase.from("session_block_items").insert({
            block_id: accessoryBlock.id,
            exercise_id: curl.id,
            item_order: order++,
            sets: 3,
            reps: 12,
            weight_kg: Math.round(bicepWeight * 0.3), // Biceps much lighter than bench
            notes: "Endurance - Controlled tempo, no swinging, squeeze at top",
          });
        }

        // Tricep Extension - ENDURANCE (3×12 @ 60%)
        const tricep = await findExercise(["Overhead DB Tricep Extension", "DB Skull Crusher", "Tricep Dips"]);
        if (tricep) {
          const tricepWeight = calculateWeight(strengthData.bench5rm, 0.60); // 60% of bench 1RM
          await supabase.from("session_block_items").insert({
            block_id: accessoryBlock.id,
            exercise_id: tricep.id,
            item_order: order++,
            sets: 3,
            reps: 12,
            weight_kg: Math.round(tricepWeight * 0.35), // Triceps lighter than bench
            notes: "Endurance - Elbows stay in position, full extension, control the weight",
          });
        }
      }

    } else {
      // FULL BODY WORKOUT
      const { data: mainBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Full Body Strength",
          rounds: 1,
          block_order: 0,
        })
        .select()
        .single();

      if (mainBlock) {
        let order = 0;
        
        // Squat
        const squat = await findExercise(["Squat", "Goblet Squat"]);
        if (squat) {
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: squat.id,
            item_order: order++,
            sets: 3,
            reps: 10,
          });
        }

        // Bench or Press
        const press = await findExercise(["Bench Press", "DB Chest Press"]);
        if (press) {
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: press.id,
            item_order: order++,
            sets: 3,
            reps: 10,
          });
        }

        // Deadlift or RDL
        const deadlift = await findExercise(["Deadlift", "RDL"]);
        if (deadlift) {
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: deadlift.id,
            item_order: order++,
            sets: 3,
            reps: 8,
          });
        }

        // Row
        const row = await findExercise(["Bent Over Row", "DB Row"]);
        if (row) {
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: row.id,
            item_order: order++,
            sets: 3,
            reps: 10,
          });
        }
      }
    }

    console.log(`✅ Strength workout "${session.title}" generated successfully`);
  } catch (error: any) {
    console.error(`❌ Error generating strength exercises:`, error);
    warnings.push(`Error generating strength exercises: ${error.message}`);
  }
}

/**
 * Generate a cardio workout (placeholder - to be implemented)
 */
async function generateCardioWorkout(
  supabase: SupabaseClient,
  planDayId: string,
  session: SessionBlock,
  warnings: string[]
) {
  // TODO: Implement cardio workout generation
  const { data: sessionData, error } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name: session.title,
      order_index: 1,
    })
    .select()
    .single();

  if (error || !sessionData) {
    warnings.push(`Failed to create cardio session: ${error?.message}`);
    return;
  }

  await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: session.title,
      rounds: 1,
      parameters: {
        detail: session.detail,
        effort: session.effort,
      },
    });

  warnings.push(`Cardio workout "${session.title}" created as placeholder - full implementation pending`);
}

/**
 * Generate a recovery workout (placeholder - to be implemented)
 */
async function generateRecoveryWorkout(
  supabase: SupabaseClient,
  planDayId: string,
  session: SessionBlock,
  warnings: string[]
) {
  const { data: sessionData, error } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name: session.title,
      order_index: 1,
    })
    .select()
    .single();

  if (error || !sessionData) {
    warnings.push(`Failed to create recovery session: ${error?.message}`);
    return;
  }

  await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: session.title,
      rounds: 1,
      parameters: {
        detail: session.detail,
        effort: session.effort,
      },
    });
}

/**
 * Duplicate Week 1 sessions to Week 2 with progressive overload
 */
async function duplicateWeekWithProgression(
  supabase: SupabaseClient,
  planDays: any[],
  programme: Programme,
  warnings: string[]
) {
  // Week 2 starts at day 8 (index 7)
  for (let i = 0; i < 7; i++) {
    const week1Day = planDays[i];
    const week2Day = planDays[i + 7];

    if (!week1Day || !week2Day) continue;

    // Get Week 1 sessions
    const { data: week1Sessions } = await supabase
      .from("sessions")
      .select(`
        *,
        session_blocks (
          *,
          session_block_items (
            *
          )
        )
      `)
      .eq("plan_day_id", week1Day.id);

    if (!week1Sessions || week1Sessions.length === 0) continue;

    // Duplicate each session to Week 2 with progression
    for (const session of week1Sessions) {
      const { data: newSession, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          plan_day_id: week2Day.id,
          name: session.name,
          order_index: session.order_index,
        })
        .select()
        .single();

      if (sessionError || !newSession) {
        warnings.push(`Failed to duplicate session to Week 2: ${sessionError?.message}`);
        continue;
      }

      // Duplicate blocks with progression
      for (const block of session.session_blocks || []) {
        const progressedParams = applyProgression(block.parameters, block.block_type);

        const { data: newBlock, error: blockError } = await supabase
          .from("session_blocks")
          .insert({
            session_id: newSession.id,
            block_type: block.block_type,
            title: block.title,
            rounds: block.rounds,
            parameters: progressedParams,
          })
          .select()
          .single();

        if (blockError || !newBlock) {
          warnings.push(`Failed to duplicate block to Week 2: ${blockError?.message}`);
          continue;
        }

        // Duplicate items with progression
        for (const item of block.session_block_items || []) {
          const progressedExtra = applyItemProgression(item.extra, block.block_type);

          // Apply progression to numeric columns too
          let progressedDistance = item.distance_m;
          let progressedDuration = item.duration_sec;
          let progressedSets = item.sets;

          // Increase distance by standard increments (not percentage)
          if (item.distance_m) {
            // Round to nearest km, then add 1km
            const currentKm = Math.round(item.distance_m / 1000);
            if (currentKm >= 10) {
              progressedDistance = (currentKm + 2) * 1000; // +2km for long runs
            } else if (currentKm >= 5) {
              progressedDistance = (currentKm + 1) * 1000; // +1km for medium runs
            } else {
              progressedDistance = item.distance_m; // Keep same for short distances
            }
          }

          // Increase duration by standard increments (5 or 10 min)
          if (item.duration_sec) {
            if (item.duration_sec >= 30) {
              progressedDuration = item.duration_sec + 10; // +10 min for long runs
            } else if (item.duration_sec >= 10) {
              progressedDuration = item.duration_sec + 5; // +5 min for medium runs
            } else {
              progressedDuration = item.duration_sec; // Keep same for short durations
            }
          }

          // Increase sets by +2 for intervals
          if (item.sets && block.block_type === "intervals") {
            progressedSets = item.sets + 2;
          }

          await supabase
            .from("session_block_items")
            .insert({
              block_id: newBlock.id,
              exercise_id: item.exercise_id,
              status: "draft",
              item_order: item.item_order,
              sets: progressedSets,
              reps: item.reps,
              distance_m: progressedDistance,
              duration_sec: progressedDuration,
              rest_sec: item.rest_sec,
              notes: item.notes ? `Week 2: ${item.notes}` : null,
              extra: progressedExtra,
            });
        }
      }
    }
  }

  console.log("✅ Week 2 created with progressive overload");
}

/**
 * Apply progressive overload to block parameters
 */
function applyProgression(params: any, blockType: string): any {
  if (!params) return params;

  const progressed = { ...params };

  // Running progression
  if (blockType === "intervals" && params.reps) {
    progressed.reps = params.reps + 2; // +2 reps
  }

  if (params.distance) {
    // Increase distance by ~10%
    const match = params.distance.match(/(\d+)–(\d+)km/);
    if (match) {
      const min = parseInt(match[1]) + 1;
      const max = parseInt(match[2]) + 2;
      progressed.distance = `${min}–${max}km`;
    } else {
      const kmMatch = params.distance.match(/(\d+)km/);
      if (kmMatch) {
        progressed.distance = `${parseInt(kmMatch[1]) + 1}km`;
      }
    }
  }

  return progressed;
}

/**
 * Apply progressive overload to item extra data
 */
function applyItemProgression(extra: any, blockType: string): any {
  if (!extra) return extra;

  const progressed = { ...extra };

  // Increase reps for intervals
  if (extra.sets && blockType === "intervals") {
    progressed.sets = extra.sets + 2;
  }

  // Increase distance
  if (extra.distance) {
    const match = extra.distance.match(/(\d+)–(\d+)km/);
    if (match) {
      progressed.distance = `${parseInt(match[1]) + 1}–${parseInt(match[2]) + 2}km`;
    } else {
      const kmMatch = extra.distance.match(/(\d+)km/);
      if (kmMatch) {
        progressed.distance = `${parseInt(kmMatch[1]) + 1}km`;
      }
    }
  }

  // Update notes to mention Week 2 progression
  if (extra.notes) {
    progressed.notes = `Week 2: ${extra.notes}`;
  }

  return progressed;
}

