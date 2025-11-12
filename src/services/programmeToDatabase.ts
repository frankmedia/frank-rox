/**
 * Programme to Database Service
 * 
 * Converts the generated programme (from ProgrammeBuilder) into actual
 * database records (plans, plan_days, sessions, blocks, items).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { createRunSession, type RunSessionOptions } from "./generators/runGenerator";
import { addStrengthFinisher, getFinisherRotation } from "./generators/strengthFinisher";
import { createRecoverySessionsForRestDays } from "./programGeneration/recoverySessionCreator";
import { applyProgressionToItem, applyProgressionToBlock } from "./programGeneration/progression";

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
    runSessionsPerWeek: programme.preferences?.runSessionsPerWeek,
  });

  const warnings: string[] = [];
  
  // Check if running is allowed (for cardio generator)
  const allowRunning = (programme.preferences?.runSessionsPerWeek ?? 2) > 0;

  try {
    // 0. Delete any existing active plans for this user (for clean testing)
    console.log("🗑️ Checking for existing active plans...");
    const { data: existingPlans } = await supabase
      .from("plans")
      .select("id")
      .eq("client_id", clientId)
      .eq("status", "active");
    
    if (existingPlans && existingPlans.length > 0) {
      console.log(`🗑️ Deleting ${existingPlans.length} existing active plan(s)...`);
      for (const plan of existingPlans) {
        // Get all plan_days for this plan
        const { data: planDays } = await supabase
          .from("plan_days")
          .select("id")
          .eq("plan_id", plan.id);
        
        if (planDays && planDays.length > 0) {
          console.log(`🗑️ Deleting ${planDays.length} plan days and their sessions...`);
          for (const planDay of planDays) {
            // Get all sessions for this day
            const { data: sessions } = await supabase
              .from("sessions")
              .select("id")
              .eq("plan_day_id", planDay.id);
            
            if (sessions && sessions.length > 0) {
              for (const session of sessions) {
                // Get all blocks for this session
                const { data: blocks } = await supabase
                  .from("session_blocks")
                  .select("id")
                  .eq("session_id", session.id);
                
                if (blocks && blocks.length > 0) {
                  for (const block of blocks) {
                    // Delete all items in this block
                    await supabase.from("session_block_items").delete().eq("block_id", block.id);
                  }
                  // Delete all blocks in this session
                  await supabase.from("session_blocks").delete().eq("session_id", session.id);
                }
              }
              // Delete all sessions for this day
              await supabase.from("sessions").delete().eq("plan_day_id", planDay.id);
            }
          }
          // Delete all plan_days for this plan
          await supabase.from("plan_days").delete().eq("plan_id", plan.id);
        }
        
        // Finally, delete the plan itself
        await supabase.from("plans").delete().eq("id", plan.id);
      }
      console.log("✅ Existing plans and all associated data deleted");
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

    // 3. Identify rest days (will create recovery sessions after main workouts)
    const sessionDays = new Set(programme.sessions.map(s => s.day));
    console.log(`📅 Session days: ${Array.from(sessionDays).join(', ')}`);

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
          await generateCardioWorkout(supabase, planDay.id, session, warnings, allowRunning);
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

    // 4. Create Active Recovery sessions for ALL rest days (NEW CLEAN LOGIC)
    const { sessionIds: recoverySessionIds, errors: recoveryErrors } = await createRecoverySessionsForRestDays(
      supabase,
      planDays,
      sessionDays
    );
    
    warnings.push(...recoveryErrors);
    console.log(`✅ Created ${recoverySessionIds.length} recovery sessions for rest days`);

    // 5. Duplicate Week 1 sessions to Week 2 with progressive overload
    await duplicateWeekWithProgression(supabase, planDays, programme, warnings);

    return { planId: plan.id, warnings };
  } catch (error: any) {
    throw new Error(`Failed to create programme in database: ${error.message}`);
  }
}

/**
 * Helper: Fetch strength data from client onboarding answers
 */
async function fetchStrengthData(
  supabase: SupabaseClient,
  clientId: string
): Promise<{
  bench5rm: number;
  squat5rm: number;
  deadlift5rm: number;
  ohp5rm: number;
}> {
  const defaults = {
    bench5rm: 40,
    squat5rm: 60,
    deadlift5rm: 80,
    ohp5rm: 20,
  };

  try {
    const { data: client } = await supabase
      .from("clients")
      .select("onboarding_answers")
      .eq("id", clientId)
      .single();

    if (!client?.onboarding_answers) {
      return defaults;
    }

    const answers = client.onboarding_answers;
    
    return {
      bench5rm: answers.bench5rm ? parseWeight(answers.bench5rm) : defaults.bench5rm,
      squat5rm: answers.squat5rm ? parseWeight(answers.squat5rm) : defaults.squat5rm,
      deadlift5rm: answers.deadlift5rm ? parseWeight(answers.deadlift5rm) : defaults.deadlift5rm,
      ohp5rm: answers.ohp5rm ? parseWeight(answers.ohp5rm) : defaults.ohp5rm,
    };
  } catch (error) {
    console.error("❌ Error fetching strength data:", error);
    return defaults;
  }
}

/**
 * Helper: Parse weight from onboarding answer (e.g., "60-80kg" -> 70)
 */
function parseWeight(value: string): number {
  if (!value) return 0;
  
  // Handle "Not sure" or similar
  if (value.toLowerCase().includes("not") || value.toLowerCase().includes("sure")) {
    return 0;
  }
  
  // Handle ranges like "60-80kg"
  const rangeMatch = value.match(/(\d+)-(\d+)/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    return Math.round((min + max) / 2);
  }
  
  // Handle single numbers like "60kg" or "60"
  const numMatch = value.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }
  
  return 0;
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
  console.log(`📍 Plan day ID: ${planDayId}`);
  
  // Get the plan to find the client_id
  const { data: planDay, error: planDayError } = await supabase
    .from("plan_days")
    .select("plan_id, plans!inner(client_id)")
    .eq("id", planDayId)
    .single();
  
  if (planDayError) {
    console.error(`❌ Failed to fetch plan day:`, planDayError);
    warnings.push(`Failed to fetch plan day: ${planDayError.message}`);
    return;
  }
  
  console.log(`✅ Plan day fetched:`, planDay);

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

  // Helper: Check if exercise uses barbell/bench (plates) vs dumbbells
  function isBarbellExercise(exerciseName: string): boolean {
    const name = exerciseName.toLowerCase();
    // Barbell/bench exercises (use plates)
    const barbellKeywords = [
      "squat", "bench press", "deadlift", "row", "lat pulldown", 
      "leg press", "incline bench", "overhead press", "strict press",
      "rdl", "romanian deadlift", "bent over row"
    ];
    // Exclude dumbbell exercises
    const dumbbellKeywords = ["db ", "dumbbell", "goblet"];
    
    // Check if it's a dumbbell exercise first
    if (dumbbellKeywords.some(keyword => name.includes(keyword))) {
      return false;
    }
    
    // Check if it's a barbell exercise
    return barbellKeywords.some(keyword => name.includes(keyword));
  }

  // Helper: Round weight for barbell/bench exercises (plates: 2.5kg increments)
  // Standard plates: 1.25kg, 2.5kg, 5kg, 10kg, 15kg, 20kg, 25kg per side
  // Smallest increment: 2 × 1.25kg = 2.5kg total
  // So weights: 20kg (bar), 22.5kg, 25kg, 27.5kg, 30kg, 32.5kg, 35kg, etc.
  function roundToPlateWeight(weight: number): number {
    // Round to nearest 2.5kg increment
    return Math.round(weight / 2.5) * 2.5;
  }

  // Helper: Round weight for dumbbell/kettlebell exercises (must be EVEN numbers: 2kg increments)
  // Most gyms have dumbbells/kettlebells in even increments: 2kg, 4kg, 6kg, 8kg, 10kg, 12kg, 14kg, 16kg, 18kg, 20kg, etc.
  function roundToDumbbellWeight(weight: number): number {
    // Round to nearest even number (2kg increments)
    return Math.round(weight / 2) * 2;
  }

  // Helper: Calculate working weight based on percentage of 1RM
  // Applies correct rounding based on exercise type (barbell vs dumbbell)
  function calculateWeight(fiveRM: number, percentage: number, exerciseName?: string): number {
    const oneRM = calculate1RM(fiveRM);
    const rawWeight = oneRM * percentage;
    
    // Apply correct rounding based on exercise type
    if (exerciseName && isBarbellExercise(exerciseName)) {
      return roundToPlateWeight(rawWeight);
    } else {
      // Default to dumbbell rounding (1kg increments)
      return roundToDumbbellWeight(rawWeight);
    }
  }

  // Helper: Round any weight to nearest even number (legacy - use specific functions instead)
  function roundToEven(weight: number): number {
    return Math.round(weight / 2) * 2;
  }

  // Determine the split type from the title
  let split: "lower" | "upper" | "full_body" = "full_body";
  if (session.title.toLowerCase().includes("lower")) {
    split = "lower";
  } else if (session.title.toLowerCase().includes("upper")) {
    split = "upper";
  }
  
  // Create session-level educational notes
  let sessionNotes = "";
  if (split === "lower") {
    sessionNotes = "Building foundational leg strength with compound movements. Focus on depth, explosive drive, and maintaining proper form to improve power output for running and functional movements. Progressive overload each week builds strength systematically.";
  } else if (split === "upper") {
    sessionNotes = "Developing upper body strength and muscular balance. Compound pressing and pulling movements build functional strength for everyday activities and sports performance. Focus on controlled tempo and full range of motion.";
  } else {
    sessionNotes = "Full body strength session targeting major muscle groups. Balanced approach to build overall strength, improve movement patterns, and enhance athletic performance across all domains.";
  }

  // Create the session
  const { data: sessionData, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name: session.title,
      notes: sessionNotes,
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
      if (data) {
        console.log(`✅ Found exercise: ${data.name} (searched: ${name})`);
        return data;
      }
    }
    console.warn(`⚠️ Exercise NOT FOUND in database. Searched for: ${names.join(", ")}`);
    warnings.push(`Exercise not found: ${names.join(", ")}`);
    return null;
  };

  try {
    console.log(`🔧 Starting ${split} body workout generation`);
    
    if (split === "lower") {
      // LOWER BODY WORKOUT
      console.log(`📋 Creating warm-up block for session ${sessionData.id}`);
      
      // Warm-up Block: Air Squats for movement prep
      const { data: warmupBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "mobility",
          title: "Warm-up",
          rounds: 1,
        })
        .select()
        .single();

      if (warmupBlock) {
        const AIR_SQUAT_ID = "d035abfc-002c-438d-933f-4c304accb805";
        const { data: airSquat } = await supabase
          .from("exercises")
          .select("id, name")
          .eq("id", AIR_SQUAT_ID)
          .single();
        
        if (airSquat) {
          await supabase.from("session_block_items").insert({
            block_id: warmupBlock.id,
            exercise_id: airSquat.id,
            item_order: 0,
            sets: 2,
            reps: 10,
            notes: "Movement prep - no weight, focus on form and depth"
          });
          console.log(`✅ Added Air Squat warm-up (2×10)`);
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
        })
        .select()
        .single();

      if (mainBlock) {
        let order = 0;
        
        // 1. Back Squat - STRENGTH (4×6 @ 80%)
        // Use specific exercise ID to avoid matching wrong exercise (e.g., Goblet Squat)
        const SQUAT_ID = "a4902a64-b188-4ea8-a567-df330a5f0f96";
        const { data: squat } = await supabase
          .from("exercises")
          .select("id, name")
          .eq("id", SQUAT_ID)
          .single();
        
        if (squat) {
          const squatWeight = calculateWeight(strengthData.squat5rm, 0.80, squat.name); // 80% of 1RM
          console.log(`✅ Using squat: ${squat.name} (ID: ${squat.id}), weight: ${squatWeight}kg`);
          
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: squat.id,
            item_order: order++,
            sets: 4,
            reps: 6,
            notes: "Strength (4-6 reps) - 80% 1RM, focus on depth and explosive drive",
            extra: { weight_kg: squatWeight },
          });
        } else {
          console.warn(`⚠️ Squat exercise not found (ID: ${SQUAT_ID})`);
          warnings.push(`Squat exercise not found`);
        }

        // 2. Bulgarian Split Squat (Rear-Foot Elevated) - HYPERTROPHY (3×10 @ 70%)
        const BULGARIAN_SPLIT_SQUAT_ID = "959709d8-99db-4dfa-ad8b-353c7e09c28e";
        const { data: bulgarian } = await supabase
          .from("exercises")
          .select("id, name")
          .eq("id", BULGARIAN_SPLIT_SQUAT_ID)
          .single();
        
        if (bulgarian) {
          // Bulgarian Split Squat uses dumbbells - calculate per-hand weight
          // Single-leg exercise: use 25-30% of squat 1RM per hand (much lighter than barbell)
          const oneRM = calculate1RM(strengthData.squat5rm);
          const rawWeight = oneRM * 0.25; // 25% of squat 1RM per hand
          const finalWeight = roundToDumbbellWeight(rawWeight);
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: bulgarian.id,
            item_order: order++,
            sets: 3,
            reps: 10,
            notes: "Hypertrophy (8-12 reps) - Each leg, controlled 3-0-1 tempo, maintain upright torso",
            extra: { weight_kg: finalWeight },
          });
        }

        // 3. Romanian Deadlift - HYPERTROPHY (3×10 @ 70%)
        // Prioritize DB version (dumbbell) over barbell version
        const rdl = await findExercise(["DB Romanian Deadlift", "Romanian Deadlift", "RDL"]);
        if (rdl) {
          const oneRM = calculate1RM(strengthData.deadlift5rm);
          // Check if it's a DB exercise
          const isDB = rdl.name.toLowerCase().includes("db ") || rdl.name.toLowerCase().includes("dumbbell");
          
          if (isDB) {
            // DB Romanian Deadlift: use 30-35% of deadlift 1RM per hand (much lighter than barbell)
            const rawWeight = oneRM * 0.35; // 35% of deadlift 1RM per hand
            const rdlWeight = roundToDumbbellWeight(rawWeight);
            await supabase.from("session_block_items").insert({
              block_id: mainBlock.id,
              exercise_id: rdl.id,
              item_order: order++,
              sets: 3,
              reps: 10,
              notes: "Hypertrophy (8-12 reps) - Feel the hamstring stretch, keep bar close to legs",
              extra: { weight_kg: rdlWeight },
            });
          } else {
            // Barbell Romanian Deadlift: use 70% of deadlift 1RM
            const rawWeight = oneRM * 0.70;
            const rdlWeight = roundToPlateWeight(rawWeight);
            await supabase.from("session_block_items").insert({
              block_id: mainBlock.id,
              exercise_id: rdl.id,
              item_order: order++,
              sets: 3,
              reps: 10,
              notes: "Hypertrophy (8-12 reps) - Feel the hamstring stretch, keep bar close to legs",
              extra: { weight_kg: rdlWeight },
            });
          }
        }

        // 4. Leg Press - ENDURANCE (3×12 @ 65%)
        const legPress = await findExercise(["Leg Press"]);
        if (legPress) {
          // Calculate raw weight first, then multiply, then round
          const oneRM = calculate1RM(strengthData.squat5rm);
          const rawWeight = oneRM * 0.65 * 1.5; // 65% of squat 1RM × 1.5 (leg press typically heavier)
          // Leg press uses plates, so use plate rounding
          const finalWeight = roundToPlateWeight(rawWeight);
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: legPress.id,
            item_order: order++,
            sets: 3,
            reps: 12,
            notes: "Endurance (12-15 reps) - Full ROM, don't lock knees at top",
            extra: { weight_kg: finalWeight },
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
      console.log(`📋 Creating upper body session ${sessionData.id}`);
      
      // Main Work Block (warm-up is handled by the 5min cardio block above)
      const { data: mainBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Upper Body Strength",
          rounds: 1,
        })
        .select()
        .single();

      if (mainBlock) {
        let order = 0;
        
        // 1. Bench Press - STRENGTH (4×6 @ 80%)
        const bench = await findExercise(["Bench Press", "DB Chest Press", "Chest Press"]);
        if (bench) {
          const oneRM = calculate1RM(strengthData.bench5rm);
          // Check if it's a DB exercise
          const isDB = bench.name.toLowerCase().includes("db ") || bench.name.toLowerCase().includes("dumbbell");
          
          if (isDB) {
            // DB Chest Press: use 35-40% of bench 1RM per hand (much lighter than barbell)
            const rawWeight = oneRM * 0.38; // 38% of bench 1RM per hand
            const benchWeight = roundToDumbbellWeight(rawWeight);
            await supabase.from("session_block_items").insert({
              block_id: mainBlock.id,
              exercise_id: bench.id,
              item_order: order++,
              sets: 4,
              reps: 6,
              notes: "Strength - 80% 1RM equivalent, control the descent (3s), explosive press",
              extra: { weight_kg: benchWeight },
            });
          } else {
            // Barbell Bench Press: use 80% of 1RM
            const rawWeight = oneRM * 0.80;
            const benchWeight = roundToPlateWeight(rawWeight);
            await supabase.from("session_block_items").insert({
              block_id: mainBlock.id,
              exercise_id: bench.id,
              item_order: order++,
              sets: 4,
              reps: 6,
              notes: "Strength - 80% 1RM, control the descent (3s), explosive press",
              extra: { weight_kg: benchWeight },
            });
          }
        }

        // 2. Bent Over Row - HYPERTROPHY (4×10 @ 75%)
        // Prioritize DB version (dumbbell) over barbell version
        const row = await findExercise(["DB Bent-Over Row", "Single Arm DB Row", "Bent Over Row"]);
        if (row) {
          const oneRM = calculate1RM(strengthData.bench5rm);
          // Check if it's a DB exercise
          const isDB = row.name.toLowerCase().includes("db ") || row.name.toLowerCase().includes("dumbbell") || row.name.toLowerCase().includes("single arm");
          
          if (isDB) {
            // DB Bent-Over Row: use 35-38% of bench 1RM per hand (pulling exercises are typically heavier than pushing)
            const rawWeight = oneRM * 0.36; // 36% of bench 1RM per hand
            const finalWeight = roundToDumbbellWeight(rawWeight);
            await supabase.from("session_block_items").insert({
              block_id: mainBlock.id,
              exercise_id: row.id,
              item_order: order++,
              sets: 4,
              reps: 10,
              notes: "Hypertrophy (8-12 reps) - Pull to ribs, squeeze scapulae at top, 2s hold",
              extra: { weight_kg: finalWeight },
            });
          } else {
            // Barbell Bent-Over Row: use 75% of bench 1RM × 0.9 (rows typically lighter)
            const rawWeight = oneRM * 0.75 * 0.9;
            const finalWeight = roundToPlateWeight(rawWeight);
            await supabase.from("session_block_items").insert({
              block_id: mainBlock.id,
              exercise_id: row.id,
              item_order: order++,
              sets: 4,
              reps: 10,
              notes: "Hypertrophy (8-12 reps) - Pull to ribs, squeeze scapulae at top, 2s hold",
              extra: { weight_kg: finalWeight },
            });
          }
        }

        // 3. DB Shoulder Press - HYPERTROPHY (3×10 @ 70%)
        const shoulderPress = await findExercise(["DB Shoulder Press", "Shoulder Press", "DB Overhead Press"]);
        if (shoulderPress) {
          const oneRM = calculate1RM(strengthData.ohp5rm);
          // Check if it's a DB exercise
          const isDB = shoulderPress.name.toLowerCase().includes("db ") || shoulderPress.name.toLowerCase().includes("dumbbell");
          
          if (isDB) {
            // DB Shoulder Press: use 30-35% of OHP 1RM per hand (much lighter than barbell)
            const rawWeight = oneRM * 0.32; // 32% of OHP 1RM per hand
            const shoulderWeight = roundToDumbbellWeight(rawWeight);
            await supabase.from("session_block_items").insert({
              block_id: mainBlock.id,
              exercise_id: shoulderPress.id,
              item_order: order++,
              sets: 3,
              reps: 10,
              notes: "Hypertrophy (8-12 reps) - Full ROM, controlled tempo, avoid arching back",
              extra: { weight_kg: shoulderWeight },
            });
          } else {
            // Barbell Shoulder Press: use 70% of OHP 1RM
            const rawWeight = oneRM * 0.70;
            const shoulderWeight = roundToPlateWeight(rawWeight);
            await supabase.from("session_block_items").insert({
              block_id: mainBlock.id,
              exercise_id: shoulderPress.id,
              item_order: order++,
              sets: 3,
              reps: 10,
              notes: "Hypertrophy (8-12 reps) - Full ROM, controlled tempo, avoid arching back",
              extra: { weight_kg: shoulderWeight },
            });
          }
        }

        // 4. Lat Pulldown - HYPERTROPHY (3×10 @ 70%)
        const lat = await findExercise(["Lat Pulldown", "Wide Grip Pull Up", "Pull Up"]);
        if (lat) {
          // Calculate raw weight first, then multiply, then round
          const oneRM = calculate1RM(strengthData.bench5rm);
          const rawWeight = oneRM * 0.70 * 0.85; // 70% of bench 1RM × 0.85 (lats typically lighter)
          // Lat pulldown uses plates (machine), so use plate rounding
          const finalWeight = roundToPlateWeight(rawWeight);
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: lat.id,
            item_order: order++,
            sets: 3,
            reps: 10,
            notes: "Hypertrophy (8-12 reps) - Pull to upper chest, squeeze lats, slow eccentric",
            extra: { weight_kg: finalWeight },
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
        })
        .select()
        .single();

      if (accessoryBlock) {
        let order = 0;
        
        // DB Bicep Curl - ENDURANCE (3×12 @ 60%)
        const curl = await findExercise(["DB Bicep Curl", "Bicep Curl"]);
        if (curl) {
          // DB Bicep Curl: use 15-18% of bench 1RM per hand (accessory exercise, but still challenging)
          const oneRM = calculate1RM(strengthData.bench5rm);
          const rawWeight = oneRM * 0.16; // 16% of bench 1RM per hand
          const finalWeight = roundToDumbbellWeight(rawWeight);
          await supabase.from("session_block_items").insert({
            block_id: accessoryBlock.id,
            exercise_id: curl.id,
            item_order: order++,
            sets: 3,
            reps: 12,
            notes: "Endurance (12-15 reps) - Controlled tempo, no swinging, squeeze at top",
            extra: { weight_kg: finalWeight },
          });
        }

        // Tricep Extension - ENDURANCE (3×12 @ 60%)
        const tricep = await findExercise(["Overhead DB Tricep Extension", "DB Skull Crusher", "Tricep Dips"]);
        if (tricep) {
          // DB Tricep Extension: use 15-18% of bench 1RM per hand (accessory exercise, lighter than bench)
          const oneRM = calculate1RM(strengthData.bench5rm);
          const rawWeight = oneRM * 0.16; // 16% of bench 1RM per hand
          const finalWeight = roundToDumbbellWeight(rawWeight);
          await supabase.from("session_block_items").insert({
            block_id: accessoryBlock.id,
            exercise_id: tricep.id,
            item_order: order++,
            sets: 3,
            reps: 12,
            notes: "Endurance (12-15 reps) - Elbows stay in position, full extension, control the weight",
            extra: { weight_kg: finalWeight },
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

    // ADD CARDIO FINISHER if title includes "Cardio Finisher"
    if (session.title.includes("Cardio Finisher")) {
      console.log(`🔥 Adding 15min cardio finisher to ${split} body session`);
      
      const { data: cardioBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "cardio",
          title: "Cardio Finisher",
          rounds: 1,
        })
        .select()
        .single();

      if (cardioBlock) {
        let order = 0;
        
        // Choose finisher based on split (alternate between erg types)
        // Use specific IDs to avoid matching "SkiErg 50/10 Intervals" or "RowErg Intervals 40/20"
        const SKIERG_ID = "917c05c6-5adf-4d3b-887e-ff2a292fa079";
        const ROWERG_ID = "d8f8bf07-c315-40a4-ae0c-b3fcb4db74e2";
        
        if (split === "lower") {
          // SkiErg after lower body
          await supabase.from("session_block_items").insert({
            block_id: cardioBlock.id,
            exercise_id: SKIERG_ID,
            item_order: order++,
            duration_sec: 900, // 15 minutes
            notes: "15min steady-state or intervals - maintain consistent output"
          });
        } else {
          // RowErg after upper body
          await supabase.from("session_block_items").insert({
            block_id: cardioBlock.id,
            exercise_id: ROWERG_ID,
            item_order: order++,
            duration_sec: 900, // 15 minutes
            notes: "15min steady-state or intervals - focus on consistent pace"
          });
        }
        
        console.log(`✅ Cardio finisher added to ${split} body session`);
      }
    }

    // ADD 4-MIN INTENSITY FINISHER (New feature: rotates through 3 options)
    // Get day index from planDay to determine which finisher to use
    const { data: planDay } = await supabase
      .from("plan_days")
      .select("day_index")
      .eq("id", planDayId)
      .single();
    
    if (planDay) {
      const finisherNum = getFinisherRotation(planDay.day_index);
      try {
        await addStrengthFinisher(supabase, sessionData.id, finisherNum);
        console.log(`✅ Added 4min finisher #${finisherNum} to strength session (Day ${planDay.day_index})`);
      } catch (error: any) {
        console.error("❌ Failed to add 4min finisher:", error);
        warnings.push(`Failed to add 4min finisher: ${error.message}`);
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
  warnings: string[],
  allowRunning: boolean = true
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

  // Import and use cardio generator
  try {
    const { createCardioSession } = await import("./generators/cardioGenerator");
    const { CardioWorkoutType } = await import("../services/cardioWorkoutSelector");
    
    // Get workout type from session.detail (set by programme builder)
    const sessionType = session.detail as CardioWorkoutType || "machine-endurance";
    
    console.log(`🏃 Creating cardio workout: ${sessionType}, allowRunning = ${allowRunning}`);
    
    // Delete the placeholder session we just created
    await supabase.from("sessions").delete().eq("id", sessionData.id);
    
    // Create proper cardio session (45-60 min for full conditioning)
    await createCardioSession(supabase, planDayId, {
      sessionType,
      intensity: session.effort as "easy" | "moderate" | "hard",
      duration: 50, // 50 minutes for full cardio sessions
      allowRunning, // Pass the allowRunning flag
      intensityModifier: 1.0 // Base intensity for Week 1
    });
    
    console.log(`✅ Generated ${sessionType} cardio workout`);
  } catch (error: any) {
    console.error("❌ Error generating cardio workout:", error);
    warnings.push(`Failed to create cardio session: ${error.message}`);
  }
}

/**
 * Generate a recovery workout
 */
async function generateRecoveryWorkout(
  supabase: SupabaseClient,
  planDayId: string,
  session: SessionBlock,
  warnings: string[]
) {
  try {
    // Import recovery generator
    const { createRecoverySession } = await import("./generators/recoveryGenerator");
    
    // Determine session type based on title
    let sessionType: "post-workout" | "active-recovery" = "active-recovery";
    
    if (session.title.toLowerCase().includes("post-workout") || session.title.toLowerCase().includes("post workout")) {
      sessionType = "post-workout";
    } else if (session.title.toLowerCase().includes("active") || session.title.toLowerCase().includes("recovery")) {
      sessionType = "active-recovery";
    }
    
    // Fetch client ID from plan_day to get strength data
    const { data: planDay } = await supabase
      .from("plan_days")
      .select("plan_id")
      .eq("id", planDayId)
      .single();
    
    if (!planDay) {
      throw new Error("Could not find plan day");
    }
    
    const { data: plan } = await supabase
      .from("plans")
      .select("client_id")
      .eq("id", planDay.plan_id)
      .single();
    
    if (!plan) {
      throw new Error("Could not find plan");
    }
    
    // Fetch strength data
    const strengthData = await fetchStrengthData(supabase, plan.client_id);
    
    // Create recovery session
    await createRecoverySession(supabase, planDayId, {
      sessionType,
      duration: sessionType === "post-workout" ? 15 : 30,
      strengthData,
    });
    
    console.log(`✅ Generated ${sessionType} recovery workout`);
  } catch (error: any) {
    console.error("❌ Error generating recovery workout:", error);
    warnings.push(`Failed to create recovery session: ${error.message}`);
  }
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

    // If Week 1 day is a rest day, mark Week 2 day as rest too
    if (week1Day.is_rest) {
      await supabase
        .from("plan_days")
        .update({ 
          is_rest: true,
          description: "Rest & Recovery"
        })
        .eq("id", week2Day.id);
    }

    // Get Week 1 sessions (including recovery sessions!)
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

    if (!week1Sessions || week1Sessions.length === 0) {
      console.log(`   Day ${i + 1}: No sessions to duplicate`);
      continue;
    }

    console.log(`   Day ${i + 1}: Duplicating ${week1Sessions.length} session(s) to Day ${i + 8}`);

    // Duplicate each session to Week 2 with progression
    for (const session of week1Sessions) {
      console.log(`     - Duplicating: ${session.name}`);

      const { data: newSession, error: sessionError } = await supabase
        .from("sessions")
        .insert({
          plan_day_id: week2Day.id,
          name: session.name,
          notes: session.notes, // Copy session notes to Week 2
          order_index: session.order_index,
        })
        .select()
        .single();

      if (sessionError || !newSession) {
        warnings.push(`Failed to duplicate session to Week 2: ${sessionError?.message}`);
        continue;
      }

      // Duplicate blocks with progression (CLEAN NEW LOGIC)
      for (const block of session.session_blocks || []) {
        const progressedParams = applyProgression(block.parameters, block.block_type);

        // Apply progression to block (rounds, etc.)
        const progressedBlock = applyProgressionToBlock({
          rounds: block.rounds,
          parameters: block.parameters,
        });

        const { data: newBlock, error: blockError } = await supabase
          .from("session_blocks")
          .insert({
            session_id: newSession.id,
            block_type: block.block_type,
            title: block.title,
            rounds: progressedBlock.rounds,
            parameters: progressedParams,
          })
          .select()
          .single();

        if (blockError || !newBlock) {
          warnings.push(`Failed to duplicate block to Week 2: ${blockError?.message}`);
          continue;
        }

        // Duplicate items with progression (CLEAN NEW LOGIC)
        for (const item of block.session_block_items || []) {
          const progressedExtra = applyItemProgression(item.extra, block.block_type);

          // Apply progression using clean module
          const progressed = applyProgressionToItem(
            {
              sets: item.sets,
              reps: item.reps,
              distance_m: item.distance_m,
              duration_sec: item.duration_sec,
              rest_sec: item.rest_sec,
            },
            {
              block_type: block.block_type,
              title: block.title,
              parameters: block.parameters,
            }
          );

          await supabase
            .from("session_block_items")
            .insert({
              block_id: newBlock.id,
              exercise_id: item.exercise_id,
              status: "draft",
              item_order: item.item_order,
              sets: progressed.sets,
              reps: progressed.reps,
              distance_m: progressed.distance_m,
              duration_sec: progressed.duration_sec,
              rest_sec: progressed.rest_sec,
              notes: item.notes ? `Week 2: ${item.notes}` : null,
              extra: progressedExtra,
            });
        }
      }
    }
  }

  // Add Farmers Carry to Week 2 Upper Body sessions (grip training)
  console.log("💪 Adding Farmers Carry to Week 2 upper body sessions...");
  
  // Helper function to find exercise by name
  const findExercise = async (names: string[]) => {
    for (const name of names) {
      const { data } = await supabase
        .from("exercises")
        .select("id, name")
        .ilike("name", `%${name}%`)
        .limit(1)
        .single();
      if (data) {
        console.log(`✅ Found exercise: ${data.name} (searched: ${name})`);
        return data;
      }
    }
    console.warn(`⚠️ Exercise NOT FOUND in database. Searched for: ${names.join(", ")}`);
    return null;
  };

  // Helper: Round weight for dumbbell/kettlebell exercises (must be EVEN numbers: 2kg increments)
  const roundToDumbbellWeight = (weight: number): number => {
    // Round to nearest even number (2kg increments)
    return Math.round(weight / 2) * 2;
  };

  // Get clientId from first plan day
  let clientId = "";
  if (planDays.length > 0) {
    const { data: planDay } = await supabase
      .from("plan_days")
      .select("plan_id, plans!inner(client_id)")
      .eq("id", planDays[0].id)
      .single();
    if (planDay && (planDay as any).plans && Array.isArray((planDay as any).plans)) {
      const plan = (planDay as any).plans[0];
      if (plan?.client_id) {
        clientId = plan.client_id;
      }
    } else if (planDay && (planDay as any).plans?.client_id) {
      clientId = (planDay as any).plans.client_id;
    }
  }

  for (let i = 7; i < 14; i++) {
    const week2Day = planDays[i];
    if (!week2Day) continue;

    // Get Week 2 sessions for this day
    const { data: week2Sessions } = await supabase
      .from("sessions")
      .select("id, name")
      .eq("plan_day_id", week2Day.id);

    if (!week2Sessions || week2Sessions.length === 0) continue;

    // Find upper body strength session
    const upperBodySession = week2Sessions.find(s => 
      s.name.toLowerCase().includes("upper") || 
      s.name.toLowerCase().includes("strength upper")
    );

    if (upperBodySession) {
      // Check if Farmers Carry already exists (avoid duplicates)
      const { data: existingBlocks } = await supabase
        .from("session_blocks")
        .select("id, title")
        .eq("session_id", upperBodySession.id);

      const hasFarmersCarry = existingBlocks?.some(b => 
        b.title?.toLowerCase().includes("farmers") || 
        b.title?.toLowerCase().includes("grip")
      );

      if (!hasFarmersCarry) {
        // Create Farmers Carry finisher block
        const { data: gripBlock } = await supabase
          .from("session_blocks")
          .insert({
            session_id: upperBodySession.id,
            block_type: "strength",
            title: "Grip Finisher",
            rounds: 3,
          })
          .select()
          .single();

        if (gripBlock) {
          // Find Farmers Carry exercise
          const farmersCarry = await findExercise(["Farmers Carry", "Farmer's Walk", "Farmer Walk"]);
          if (farmersCarry) {
            // Calculate weight: 60% of deadlift 5RM (grip strength focus)
            const strengthData = await fetchStrengthData(supabase, clientId);
            const deadlift5rm = strengthData.deadlift5rm || 80;
            // Farmers Carry uses dumbbells, so use dumbbell rounding (1kg increments)
            const farmersWeight = roundToDumbbellWeight(deadlift5rm * 0.60); // 60% of deadlift 5RM per hand
            
            await supabase.from("session_block_items").insert({
              block_id: gripBlock.id,
              exercise_id: farmersCarry.id,
              item_order: 0,
              sets: 3,
              reps: 1, // Distance-based (will be in notes)
              notes: `Week 2 Grip Training - 50m walk per set, ${farmersWeight}kg per hand. Focus on maintaining grip throughout.`,
              extra: { weight_kg: farmersWeight, distance_m: 50 },
            });
            console.log(`✅ Added Farmers Carry to ${upperBodySession.name} (Day ${week2Day.day_index})`);
          } else {
            console.warn(`⚠️ Farmers Carry exercise not found in database`);
            warnings.push(`Farmers Carry exercise not found`);
          }
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

