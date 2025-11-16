/**
 * Programme to Database Service
 * 
 * Converts the generated programme (from ProgrammeBuilder) into actual
 * database records (plans, plan_days, sessions, blocks, items).
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { CardioWorkoutType } from "@/services/cardioWorkoutSelector";
import { createRunSession, type RunSessionOptions } from "./generators/runGenerator";
import { addStrengthFinisher, getFinisherRotation } from "./generators/strengthFinisher";
import { createRecoverySessionsForRestDays } from "./programGeneration/recoverySessionCreator";
import { applyProgressionToItem, applyProgressionToBlock } from "./programGeneration/progression";
import { EXERCISE_IDS } from "@/constants/exerciseIds";

export type SessionBlock = {
  day: string;
  type: "run" | "strength" | "cardio" | "recovery";
  title: string;
  distance?: string;
  pace?: string;
  effort: "easy" | "moderate" | "hard";
  detail?: string;
  meta?: Record<string, any>;
  blockType?: BlockType;
  hyroxAccessoryType?: string;
};

type Programme = {
  sessions: SessionBlock[];
  preferences: any;
  generatedAt: string;
  blockNumber: number;
  focus: "base" | "build" | "race-prep";
  hyroxProfile?: HyroxProfile;
};

type BlockType = "onboarding" | "base" | "build" | "peak";
type RunDetailKind =
  | "easy-z2"
  | "steady-aerobic"
  | "hyrox-intervals-500m"
  | "hyrox-intervals-1k"
  | "peak-sharpen";
type HyroxProfile = {
  hasRacedHyrox: boolean;
  hyroxBestTime?: string;
  weakStations?: string[];
  goalType?: "first-time" | "improve-time" | "return-from-break";
  weeksToRace?: number | null;
};

/**
 * Create an empty plan with empty days (no sessions yet)
 */
export async function createEmptyPlanWithDays(
  supabase: SupabaseClient,
  clientId: string,
  options: {
    name: string;
    cycleDays: number;
  }
): Promise<{ planId: string }> {
  console.log("🆕 Creating empty plan:", options);

  // 1. Create the plan
  const { data: plan, error: planError } = await supabase
    .from("plans")
    .insert({
      client_id: clientId,
      name: options.name,
      status: "active",
    })
    .select()
    .single();

  if (planError || !plan) {
    throw new Error(`Failed to create plan: ${planError?.message}`);
  }

  console.log(`✅ Plan created with ID: ${plan.id}`);

  // 2. Create empty plan_days
  const planDays = [];
  for (let i = 0; i < options.cycleDays; i++) {
    planDays.push({
      plan_id: plan.id,
      day_index: i,
      day_name: `Day ${i + 1}`,
    });
  }

  const { error: daysError } = await supabase
    .from("plan_days")
    .insert(planDays);

  if (daysError) {
    throw new Error(`Failed to create plan days: ${daysError.message}`);
  }

  console.log(`✅ Created ${options.cycleDays} empty plan days`);

  return { planId: plan.id };
}

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

    // 6. Generate optional Hyrox track (14 parallel days) - ALWAYS GENERATED AS SEPARATE TRACK
    console.log("🏃 Generating optional Hyrox track (separate from main 14-day programme)...");
    const { generateHyroxTrack } = await import("./programGeneration/hyroxTrackGenerator");
    const { dayIds: hyroxDayIds, errors: hyroxErrors } = await generateHyroxTrack(supabase, plan.id);
    warnings.push(...hyroxErrors);
    console.log(`✅ Created ${hyroxDayIds.length} optional Hyrox track days (track_name: 'hyrox', is_optional: true)`);

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

function getRunSessionOptionsFromDetail(session: SessionBlock): RunSessionOptions | null {
  const detail = session.detail ?? "";
  if (!detail.startsWith("run:")) return null;

  const [, rawKind, kmStr] = detail.split(":");
  const kind = rawKind as RunDetailKind;
  const distanceKm = Number(kmStr) || 5;
  const distanceLabel =
    (session.meta?.runDistanceLabel as string | undefined) ||
    session.distance ||
    `${distanceKm}km`;
  const notes =
    typeof session.meta?.runDescription === "string"
      ? session.meta.runDescription
      : session.detail;

  switch (kind) {
    case "easy-z2":
      return {
        sessionType: "long_run",
        distance: distanceLabel,
        pace: session.pace || "Zone 2 (conversational)",
        effort: "easy",
        notes,
      };
    case "steady-aerobic":
      return {
        sessionType: "long_run",
        distance: distanceLabel,
        pace: "Steady aerobic (upper Z2/Z3)",
        effort: "moderate",
        notes,
      };
    case "hyrox-intervals-500m":
      return {
        sessionType: "intervals",
        distance: distanceLabel,
        reps: 5,
        repDistance: "500m",
        restDuration: "90s",
        pace: "Controlled hard",
        effort: "hard",
        notes,
      };
    case "hyrox-intervals-1k":
      return {
        sessionType: "intervals",
        distance: distanceLabel,
        reps: 3,
        repDistance: "1km",
        restDuration: "2min",
        pace: "HYROX race pace",
        effort: "hard",
        notes,
      };
    case "peak-sharpen":
      return {
        sessionType: "intervals",
        distance: distanceLabel,
        reps: 6,
        repDistance: "200m",
        restDuration: "90s",
        pace: "Fast but relaxed",
        effort: "moderate",
        notes,
      };
    default:
      return null;
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
  const runDetailOptions = getRunSessionOptionsFromDetail(session);
  if (runDetailOptions) {
    const result = await createRunSession(supabase, planDayId, runDetailOptions);
    warnings.push(...result.warnings);
    return;
  }

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
  const planClientId = (planDay as any)?.plans?.client_id;
  if (planClientId) {
    const { data: client } = await supabase
      .from("clients")
      .select("onboarding_answers")
      .eq("id", planClientId)
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
      // DAY 1 — LOWER STRENGTH + LIGHT HYROX CONDITIONING
      console.log(`📋 Creating Day 1: Lower Strength + Light HYROX Conditioning`);
      
      // Block A — Strength (Lower) - 5 exercises
      const { data: mainBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Lower Body Strength",
          rounds: 1,
          order_index: 1,
        })
        .select()
        .single();

      if (mainBlock) {
        let order = 0;
        const oneRM = calculate1RM(strengthData.squat5rm);
        
        // 1. Squat — 4×6 (using specific ID)
        const squatId = "a4902a64-b188-4ea8-a567-df330a5f0f96";
        const squatWeight = calculateWeight(strengthData.squat5rm, 0.80, "Squat");
        await supabase.from("session_block_items").insert({
          block_id: mainBlock.id,
          exercise_id: squatId,
          item_order: order++,
          sets: 4,
          reps: 6,
          notes: "Strength - 80% 1RM, focus on depth and explosive drive",
          extra: { weight_kg: squatWeight },
        });

        // 2. DB Romanian Deadlift — 3×8 (using specific ID)
        const dbRdlId = "5600782c-c22e-49e2-852e-073facaaff1c";
        const deadliftOneRM = calculate1RM(strengthData.deadlift5rm);
        const rdlWeight = roundToDumbbellWeight(deadliftOneRM * 0.35); // 35% per hand
        await supabase.from("session_block_items").insert({
          block_id: mainBlock.id,
          exercise_id: dbRdlId,
          item_order: order++,
          sets: 3,
          reps: 8,
          notes: "Feel the hamstring stretch, keep bar close to legs",
          extra: { weight_kg: rdlWeight },
        });

        // 3. Rear-Foot Elevated Split Squat — 3×8/leg (using specific ID)
        const bulgarianId = "959709d8-99db-4dfa-ad8b-353c7e09c28e";
        const bulgarianWeight = roundToDumbbellWeight(oneRM * 0.25); // 25% per hand
        await supabase.from("session_block_items").insert({
          block_id: mainBlock.id,
          exercise_id: bulgarianId,
          item_order: order++,
          sets: 3,
          reps: 8,
          notes: "Each leg, controlled tempo, maintain upright torso",
          extra: { weight_kg: bulgarianWeight },
        });

        // 4. Walking Lunge DB — 2×20 steps (using specific ID)
        const walkingLungeId = "fd72922a-ca60-4c66-9a0a-2605ea55053a";
        const lungeWeight = roundToDumbbellWeight(oneRM * 0.20); // 20% per hand
        await supabase.from("session_block_items").insert({
          block_id: mainBlock.id,
          exercise_id: walkingLungeId,
          item_order: order++,
          sets: 2,
          reps: 20,
          notes: "20 steps total (10 per leg), controlled movement",
          extra: { weight_kg: lungeWeight },
        });

        // 5. Wall Balls (technique) — 3×8 easy (using specific ID)
        const wallBallId = "8833980d-fc4f-42e8-83ce-7e3c22d8c28e";
        await supabase.from("session_block_items").insert({
          block_id: mainBlock.id,
          exercise_id: wallBallId,
          item_order: order++,
          sets: 3,
          reps: 8,
          notes: "Technique focus - easy weight, full depth squat, explosive throw",
        });
      }

      // Block B — Core Flow (timed circuit)
      const { data: coreBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "circuit",
          title: "Block B — Core Flow",
          rounds: 2,
          work_sec: 60,
          rest_sec: 15,
          rest_between_rounds_s: 30,
          order_index: 2,
          parameters: {
            format: "circuit",
            intensity: "moderate",
            timer: "60s work · 15s reset",
          },
        })
        .select()
        .single();

      if (coreBlock) {
        let order = 0;

        const CORE_FLOW = [
          {
            id: "d60a5793-6399-4cec-855f-44eb47c439f9", // Plank
            duration_sec: 60,
            notes: "1 min plank · neutral spine, squeeze glutes, breathe steadily.",
          },
          {
            id: "c656a23c-687d-4ccd-8dc5-2edcea151c27", // Dead Bug
            duration_sec: 45,
            notes: "45 sec dead bug · ribs down, opposite arm/leg moves slowly.",
          },
          {
            id: "9c7a2d40-74a2-4721-9107-5a0289c1f474", // Bird Dog
            duration_sec: 45,
            notes: "45 sec bird dog · reach long, no sway through pelvis.",
          },
        ];
        
        for (const movement of CORE_FLOW) {
          await supabase.from("session_block_items").insert({
            block_id: coreBlock.id,
            exercise_id: movement.id,
            item_order: order++,
            duration_sec: movement.duration_sec,
            notes: movement.notes,
          });
        }
      }

      // Block C — Light HYROX Conditioning (2 rounds circuit)
      const { data: hyroxBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "circuit",
          title: "Light HYROX Conditioning",
          rounds: 2, // 2 rounds
          rest_between_rounds_s: 60, // 1 min rest between rounds
          order_index: 3,
        })
        .select()
        .single();

      if (hyroxBlock) {
        let order = 0;
        
        // SkiErg — 200m easy
        const skiergId = "917c05c6-5adf-4d3b-887e-ff2a292fa079";
        await supabase.from("session_block_items").insert({
          block_id: hyroxBlock.id,
          exercise_id: skiergId,
          item_order: order++,
          distance_m: 200,
          notes: "Easy pace, tall catch",
        });

        // Farmer Carry — 20m
        const farmerCarryId = "45fa718b-0f3a-41ed-a7cd-baa4bfd0f821";
        await supabase.from("session_block_items").insert({
          block_id: hyroxBlock.id,
          exercise_id: farmerCarryId,
          item_order: order++,
          distance_m: 20,
          notes: "Steady pace, strong core",
        });

        // Bodyweight Lunges — 10/leg
        const bodyweightLungeId = "d7dd4a88-c878-4bb3-abe8-4bb6bf7e8275";
        await supabase.from("session_block_items").insert({
          block_id: hyroxBlock.id,
          exercise_id: bodyweightLungeId,
          item_order: order++,
          reps: 10,
          notes: "10 per leg, controlled movement",
        });
      }

    } else if (split === "upper") {
      console.log(`📋 Creating upper body session ${sessionData.id}`);

      const { data: mainBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Upper Strength",
          rounds: 1,
          order_index: 1,
        })
        .select()
        .single();

      if (mainBlock) {
        let order = 0;
        const benchFiveRM = strengthData.bench5rm ?? 60;
        const ohpFiveRM = strengthData.ohp5rm ?? benchFiveRM;
        const benchOneRM = calculate1RM(benchFiveRM);
        const ohpOneRM = calculate1RM(ohpFiveRM);

        const inclineBench = await supabase
          .from("exercises")
          .select("id, name")
          .eq("id", EXERCISE_IDS.INCLINE_BENCH)
          .single();
        if (inclineBench.data) {
          const weight = calculateWeight(benchFiveRM, 0.75, inclineBench.data.name);
          await supabase.from("session_block_items").insert({
            block_id: mainBlock.id,
            exercise_id: inclineBench.data.id,
            item_order: order++,
            sets: 3,
            reps: 6,
            notes: "3×6 · Slight incline, control 3s down, drive hard up.",
            extra: { weight_kg: weight },
          });
        }

        const dbRowWeight = roundToDumbbellWeight(benchOneRM * 0.34);
        await supabase.from("session_block_items").insert({
          block_id: mainBlock.id,
          exercise_id: EXERCISE_IDS.DB_BENT_OVER_ROW,
          item_order: order++,
          sets: 3,
          reps: 8,
          notes: "DB row · chest supported or hinge, pause at ribs.",
          extra: { weight_kg: dbRowWeight },
        });

        const dbShoulderWeight = roundToDumbbellWeight(ohpOneRM * 0.3);
        await supabase.from("session_block_items").insert({
          block_id: mainBlock.id,
          exercise_id: EXERCISE_IDS.DB_SHOULDER_PRESS,
          item_order: order++,
          sets: 3,
          reps: 8,
          notes: "Neutral grip, seated, brace glutes, no lean.",
          extra: { weight_kg: dbShoulderWeight },
        });

        const latPulldownWeight = roundToPlateWeight(benchOneRM * 0.6);
        await supabase.from("session_block_items").insert({
          block_id: mainBlock.id,
          exercise_id: EXERCISE_IDS.LAT_PULLDOWN,
          item_order: order++,
          sets: 3,
          reps: 10,
          notes: "3×10 · Pull to collarbone, elbows under bar.",
          extra: { weight_kg: latPulldownWeight },
        });
      }

      const { data: techniqueBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "cardio",
          title: "Technique Conditioning",
          parameters: { format: "standard" },
          order_index: 2,
        })
        .select()
        .single();

      if (techniqueBlock) {
        await supabase.from("session_block_items").insert({
          block_id: techniqueBlock.id,
          exercise_id: EXERCISE_IDS.ROW_ERG,
          item_order: 0,
          distance_m: 400,
          notes: "400m easy · focus on smooth catch/finish.",
        });

        await supabase.from("session_block_items").insert({
          block_id: techniqueBlock.id,
          exercise_id: EXERCISE_IDS.ASSAULT_BIKE,
          item_order: 1,
          duration_sec: 120,
          notes: "2‑min Z2 · nasal breathing, steady cadence.",
        });
      }

      const { data: upperCoreBlock } = await supabase
        .from("session_blocks")
        .insert({
          session_id: sessionData.id,
          block_type: "strength",
          title: "Core Finisher",
          rounds: 1,
          order_index: 3,
        })
        .select()
        .single();

      if (upperCoreBlock) {
        await supabase.from("session_block_items").insert({
          block_id: upperCoreBlock.id,
          exercise_id: EXERCISE_IDS.SIDE_PLANK,
          item_order: 0,
          sets: 2,
          duration_sec: 30,
          notes: "30s per side · stack hips, reach long.",
        });

        await supabase.from("session_block_items").insert({
          block_id: upperCoreBlock.id,
          exercise_id: EXERCISE_IDS.BIRD_DOG,
          item_order: 1,
          duration_sec: 40,
          notes: "40s alt · slow reach, pause at extension.",
        });
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
          order_index: 4,
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
    
    // Get workout type from session.detail (set by programme builder)
    const detail = session.detail ?? "";
    const meta = session.meta ?? {};
    const isHyroxAccessory = session.title === "HYROX Accessory";

    if (isHyroxAccessory) {
      await supabase.from("sessions").delete().eq("id", sessionData.id);
      await createHyroxAccessoryWorkout(
        supabase,
        planDayId,
        session,
        detail.startsWith("hyrox-accessory:")
          ? detail.split(":")[1] || "general-station-technique"
          : session.hyroxAccessoryType || "general-station-technique",
        warnings
      );
      return;
    }

    const sessionType =
      (meta.cardioType as CardioWorkoutType) ||
      (detail as CardioWorkoutType) ||
      "machine-endurance";
    
    console.log(`🏃 Creating cardio workout: ${sessionType}, allowRunning = ${allowRunning}`);
    
    // Delete the placeholder session we just created
    await supabase.from("sessions").delete().eq("id", sessionData.id);
    
    // Create proper cardio session (45-60 min for full conditioning)
    await createCardioSession(supabase, planDayId, {
      sessionType,
      intensity: session.effort as "easy" | "moderate" | "hard",
      duration: 50, // 50 minutes for full cardio sessions
      allowRunning, // Pass the allowRunning flag
      intensityModifier: typeof meta.intensityModifier === "number" ? meta.intensityModifier : 1.0,
      weekNumber: meta.weekNumber ?? 1,
      ladderStepsKm: Array.isArray(meta.ladderStepsKm) ? meta.ladderStepsKm : undefined,
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

type HyroxAccessoryExerciseTemplate = {
  names: string[];
  sets?: number;
  reps?: number;
  durationSec?: number;
  distanceM?: number;
  notes?: string;
  extra?: Record<string, any>;
};

type HyroxAccessoryTemplate = {
  title: string;
  description: string;
  blockType: "strength" | "circuit";
  rounds?: number;
  restBetweenRoundsSec?: number;
  parameters?: Record<string, any>;
  items: HyroxAccessoryExerciseTemplate[];
};

const DEFAULT_ACCESSORY_KIND = "general-station-technique";

const HYROX_ACCESSORY_TEMPLATES: Record<string, HyroxAccessoryTemplate> = {
  "sled-focus": {
    title: "Sled Power Primer",
    description: "Low-handle push + backward drag + lunge endurance to clean up sled stations.",
    blockType: "circuit",
    rounds: 2,
    restBetweenRoundsSec: 60,
    parameters: { format: "circuit", intensity: "moderate" },
    items: [
      {
        names: ["Sled Push", "Hyrox Sled Push"],
        distanceM: 25,
        notes: "Heavy drive · stay low, fast feet.",
      },
      {
        names: ["Sled Pull", "Hyrox Sled Pull"],
        distanceM: 25,
        notes: "Backward drag · upright torso, strong arms.",
      },
      {
        names: ["Walking Lunge DB", "Walking Lunge"],
        reps: 16,
        notes: "8/leg · moderate load, no wobble.",
      },
    ],
  },
  "wall-ball-focus": {
    title: "Wall Ball Efficiency",
    description: "Squat pattern plus overhead power to groove smoother wall balls.",
    blockType: "circuit",
    rounds: 3,
    restBetweenRoundsSec: 45,
    parameters: { format: "circuit", intensity: "moderate" },
    items: [
      {
        names: ["Wall Balls", "Wall Ball"],
        reps: 15,
        notes: "Race tempo · breathe at the top.",
      },
      {
        names: ["Goblet Squat", "Front Squat"],
        reps: 12,
        notes: "3s down, 1s pause, explosive up.",
      },
      {
        names: ["DB Shoulder Press", "Push Press", "Thruster"],
        reps: 10,
        notes: "Powerful drive overhead, no arch.",
      },
    ],
  },
  "lunges-focus": {
    title: "Lunge & Lateral Capacity",
    description: "Combine HYROX sandbag lunges prep with hip stability work.",
    blockType: "circuit",
    rounds: 3,
    restBetweenRoundsSec: 45,
    parameters: { format: "circuit", intensity: "moderate" },
    items: [
      {
        names: ["Walking Lunge DB", "Sandbag Lunge", "Walking Lunge"],
        distanceM: 20,
        notes: "10m out & back, upright torso.",
      },
      {
        names: ["Step-Ups", "Step Ups", "Box Step Up"],
        reps: 12,
        notes: "Per leg · knee to 90°, drive through heel.",
      },
      {
        names: ["Cossack Squat", "Lateral Lunge"],
        reps: 8,
        notes: "Per side · sit into hip, heel down.",
      },
    ],
  },
  "farmers-focus": {
    title: "Farmer Carry Grip Builder",
    description: "Grip, posture, and unilateral bracing work for carries.",
    blockType: "strength",
    parameters: { format: "standard", intensity: "moderate" },
    items: [
      {
        names: ["Farmer Carry", "Farmers Carry", "DB Farmers Carry"],
        sets: 3,
        distanceM: 30,
        notes: "Heavy · tall posture, small steps.",
      },
      {
        names: ["Suitcase Carry", "Single Arm Farmer Carry", "Farmers Carry"],
        sets: 2,
        distanceM: 20,
        notes: "Alternate arms each length.",
      },
      {
        names: ["Side Plank", "Side-Plank"],
        sets: 2,
        durationSec: 30,
        notes: "Oblique brace to finish · 30s/side.",
      },
    ],
  },
  "burpees-focus": {
    title: "Burpee Broad Jump Flow",
    description: "Explosive burpees, shuttle conditioning, and core control.",
    blockType: "circuit",
    rounds: 4,
    restBetweenRoundsSec: 30,
    parameters: { format: "circuit", intensity: "hard" },
    items: [
      {
        names: ["Burpee Broad Jump", "Burpees"],
        distanceM: 20,
        notes: "Broad jump out, walk back reset.",
      },
      {
        names: ["Mountain Climbers", "Mountain Climber"],
        durationSec: 40,
        notes: "Fast tempo, hips low.",
      },
      {
        names: ["Plank", "Plank Hold"],
        durationSec: 30,
        notes: "Squeeze glutes, breathe through nose.",
      },
    ],
  },
  "general-station-technique": {
    title: "Station Technique Mix",
    description: "Light machine + wall ball + carry combo to stay sharp.",
    blockType: "circuit",
    rounds: 2,
    restBetweenRoundsSec: 60,
    parameters: { format: "circuit", intensity: "easy" },
    items: [
      {
        names: ["SkiErg", "Ski Erg"],
        distanceM: 200,
        notes: "Technique pace, tall posture.",
      },
      {
        names: ["Wall Balls", "Wall Ball"],
        reps: 12,
        notes: "Light load, perfect mechanics.",
      },
      {
        names: ["Farmer Carry", "Farmers Carry", "DB Farmers Carry"],
        distanceM: 20,
        notes: "Moderate weight, nasal breathing.",
      },
    ],
  },
};

async function findHyroxAccessoryExercise(
  supabase: SupabaseClient,
  names: string[],
  warnings: string[]
) {
  for (const name of names) {
    const { data } = await supabase
      .from("exercises")
      .select("id, name")
      .ilike("name", `%${name}%`)
      .limit(1)
      .single();

    if (data) {
      console.log(`✅ [HYROX Accessory] Found exercise: ${data.name} (searched: ${name})`);
      return data;
    }
  }

  const label = names.join(", ");
  console.warn(`⚠️ [HYROX Accessory] Exercise NOT FOUND: ${label}`);
  warnings.push(`HYROX accessory exercise missing: ${label}`);
  return null;
}

async function createHyroxAccessoryWorkout(
  supabase: SupabaseClient,
  planDayId: string,
  session: SessionBlock,
  accessoryKind: string,
  warnings: string[]
) {
  const templateKey = HYROX_ACCESSORY_TEMPLATES[accessoryKind]
    ? accessoryKind
    : DEFAULT_ACCESSORY_KIND;
  const template = HYROX_ACCESSORY_TEMPLATES[templateKey];

  const { data: sessionData, error } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name: session.title,
      notes: `HYROX accessory focus: ${template.title} — ${template.description}`,
      order_index: 99,
    })
    .select()
    .single();

  if (error || !sessionData) {
    warnings.push(`Failed to create HYROX accessory session: ${error?.message}`);
    return;
  }

  const blockPayload: Record<string, any> = {
    session_id: sessionData.id,
    block_type: template.blockType,
    title: template.title,
    parameters: {
      hyrox_focus: templateKey,
      ...(template.parameters ?? {}),
    },
    order_index: 1,
  };

  if (typeof template.rounds === "number") {
    blockPayload.rounds = template.rounds;
  }
  if (typeof template.restBetweenRoundsSec === "number") {
    blockPayload.rest_between_rounds_s = template.restBetweenRoundsSec;
  }

  const { data: block, error: blockError } = await supabase
    .from("session_blocks")
    .insert(blockPayload)
    .select()
    .single();

  if (blockError || !block) {
    warnings.push(`Failed to create HYROX accessory block: ${blockError?.message}`);
    return;
  }

  let order = 0;
  let insertedCount = 0;

  for (const item of template.items) {
    const exercise = await findHyroxAccessoryExercise(supabase, item.names, warnings);
    if (!exercise) continue;

    const payload: Record<string, any> = {
      block_id: block.id,
      exercise_id: exercise.id,
      item_order: order++,
    };

    if (item.sets) payload.sets = item.sets;
    if (item.reps) payload.reps = item.reps;
    if (item.durationSec) payload.duration_sec = item.durationSec;
    if (item.distanceM) payload.distance_m = item.distanceM;
    if (item.notes) payload.notes = item.notes;
    if (item.extra) payload.extra = item.extra;

    const { error: itemError } = await supabase.from("session_block_items").insert(payload);
    if (itemError) {
      console.error("❌ Failed to add HYROX accessory exercise:", itemError);
      warnings.push(`Failed to add HYROX accessory item: ${itemError.message}`);
      continue;
    }

    insertedCount++;
  }

  if (insertedCount === 0) {
    warnings.push("HYROX accessory block created without exercises (none found).");
  } else {
    console.log(`✅ HYROX accessory session created (${template.title}) — ${insertedCount} items`);
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
      let fallbackOrder = 1;
      for (const block of session.session_blocks || []) {
        const progressedParams = applyProgression(block.parameters, block.block_type);

        // Apply progression to block (rounds, etc.)
        const progressedBlock = applyProgressionToBlock({
          rounds: block.rounds,
          parameters: block.parameters,
        });

        const orderIndex =
          typeof block.order_index === "number" ? block.order_index : fallbackOrder++;

        const { data: newBlock, error: blockError } = await supabase
          .from("session_blocks")
          .insert({
            session_id: newSession.id,
            block_type: block.block_type,
            title: block.title,
            rounds: progressedBlock.rounds,
            parameters: progressedParams,
            order_index: orderIndex,
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
              distance_m: 50,
              notes: `Week 2 Grip Training - 50m walk per set, ${farmersWeight}kg per hand. Focus on maintaining grip throughout.`,
              extra: { weight_kg: farmersWeight },
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

