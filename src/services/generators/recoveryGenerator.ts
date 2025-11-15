/**
 * Recovery/Mobility Workout Generator
 * 
 * Generates recovery and mobility workouts for hybrid training programmes.
 * Supports: Post-Workout Mobility (10-15 min), Active Recovery (30 min)
 */

import { SupabaseClient } from "@supabase/supabase-js";

const TIMED_RECOVERY_SEQUENCE: Array<{
  names: string[];
  duration: string;
  notes: string;
}> = [
  { names: ["Inchworms"], duration: "2min", notes: "Walk hands out, pause in plank, heels down on return." },
  { names: ["Hamstring Stretch"], duration: "2min", notes: "Sit tall, fold from hips, breathe into hamstrings." },
  { names: ["Hip Flexor Stretch"], duration: "4min", notes: "2 min per side · posterior pelvic tilt, reach overhead." },
  { names: ["Hip CARs", "Standing Hip CAR"], duration: "2min", notes: "Slow controlled circles, brace core, trace biggest circle." },
  { names: ["Foam Roller on Mid Back"], duration: "2min", notes: "Support head, roll mid-back, pause on tight spots." },
  { names: ["Cossack Squat"], duration: "2min", notes: "Optional finisher · alternate sides, heel down, chest tall." },
];

const LIGHT_MOBILITY_FLOW: Array<{ id: string; durationSec: number; notes: string }> = [
  { id: "c61ef2d5-014d-4e92-bd5e-201a2e8f0072", durationSec: 60, notes: "Inchworms · smooth walkouts, heels down on return." },
  { id: "ff5cef72-08a8-4168-bb47-5ae49234c463", durationSec: 60, notes: "Hamstring stretch · hinge at hips, long spine." },
  { id: "74f1bab3-ef99-48e0-95f5-4845d09e7e2", durationSec: 60, notes: "Hip flexor (R) · posterior pelvic tilt, reach tall." },
  { id: "50dfec13-2d7d-49c7-b66c-1a5149462030", durationSec: 60, notes: "Hip flexor (L) · same cues, breathe deep." },
  { id: "3d755717-f706-4b08-8b8c-8586083e6371", durationSec: 60, notes: "Standing hip CARs · slow circles, brace core." },
  { id: "4d01a06b-1ce3-48ee-a6cc-9735d4b92e5c", durationSec: 60, notes: "Foam roller mid-back · small segments, relax neck." },
];

export interface RecoverySessionOptions {
  sessionType: "post-workout" | "active-recovery" | "light-mobility";
  duration?: number; // minutes
  strengthData?: {
    bench5rm?: number;
    squat5rm?: number;
    deadlift5rm?: number;
    ohp5rm?: number;
  };
}

/**
 * Main entry point for creating recovery sessions
 */
export async function createRecoverySession(
  supabase: SupabaseClient,
  planDayId: string,
  options: RecoverySessionOptions
): Promise<void> {
  console.log(`🧘 Creating ${options.sessionType} recovery session`);

  switch (options.sessionType) {
    case "post-workout":
      await buildPostWorkoutMobility(supabase, planDayId, options);
      break;
    case "active-recovery":
      await buildActiveRecovery(supabase, planDayId, options);
      break;
    case "light-mobility":
      await buildLightMobilityFlow(supabase, planDayId);
      break;
  }
}

/**
 * Helper: Check if exercise uses barbell/bench (plates) vs dumbbells
 */
function isBarbellExercise(exerciseName: string): boolean {
  const name = exerciseName.toLowerCase();
  const dumbbellKeywords = ["db ", "dumbbell", "goblet"];
  if (dumbbellKeywords.some(keyword => name.includes(keyword))) {
    return false;
  }
  const barbellKeywords = ["squat", "bench", "deadlift", "row", "glute bridge"];
  return barbellKeywords.some(keyword => name.includes(keyword));
}

/**
 * Helper: Round weight for barbell/bench exercises (plates: 2.5kg increments)
 */
function roundToPlateWeight(weight: number): number {
  return Math.round(weight / 2.5) * 2.5;
}

/**
 * Helper: Round weight for dumbbell/kettlebell exercises (must be EVEN numbers: 2kg increments)
 */
function roundToDumbbellWeight(weight: number): number {
  // Round to nearest even number (2kg increments)
  return Math.round(weight / 2) * 2;
}

/**
 * Helper: Find exercise by name
 */
async function findExercise(
  supabase: SupabaseClient,
  names: string[]
): Promise<any> {
  for (const name of names) {
    const { data } = await supabase
      .from("exercises")
      .select("*")
      .ilike("name", `%${name}%`)
      .limit(1)
      .maybeSingle();
    
    if (data) {
      console.log(`✅ Found exercise: ${data.name} (searched: ${name})`);
      return data;
    }
  }
  console.warn(`⚠️ Exercise NOT FOUND: tried ${names.join(', ')}`);
  return null;
}

/**
 * Helper: Create session and return session data
 */
async function createSession(
  supabase: SupabaseClient,
  planDayId: string,
  name: string,
  notes?: string
) {
  const { data: sessionData, error } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name,
      notes,
      order_index: 2, // Recovery sessions come after main workout
    })
    .select()
    .single();

  if (error || !sessionData) {
    throw new Error(`Failed to create session: ${error?.message}`);
  }

  return sessionData;
}

/**
 * Helper: Add exercise item to a block
 */
async function addItem(
  supabase: SupabaseClient,
  blockId: string,
  exerciseId: string,
  order: number,
  extra: Record<string, any> = {}
) {
  const payload: Record<string, any> = {
    block_id: blockId,
    exercise_id: exerciseId,
    status: "draft",
    item_order: order,
  };

  // Parse duration for mobility exercises (stored as seconds)
  if (extra.duration) {
    const durStr = String(extra.duration);
    const durMatch = durStr.match(/(\d+)\s*(s|sec|min)/i);
    if (durMatch) {
      const value = parseInt(durMatch[1]);
      const unit = durMatch[2].toLowerCase();
      payload.duration_sec = unit.startsWith('min') ? value * 60 : value;
    }
  }
  
  if (extra.notes) payload.notes = extra.notes;
  if (Object.keys(extra).length) payload.extra = extra;

  const res = await supabase.from("session_block_items").insert(payload);
  if (res.error) throw res.error;
}

/**
 * POST-WORKOUT MOBILITY (10-15 min)
 * 
 * Quick mobility routine after main workout
 * Focus: Key muscle groups, foam rolling, static stretching
 */
async function buildPostWorkoutMobility(
  supabase: SupabaseClient,
  planDayId: string,
  options: RecoverySessionOptions
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Post-Workout Mobility",
    "Quick mobility routine to aid recovery and maintain range of motion. Focus on areas worked during today's session. Hold each stretch for 30-60 seconds, breathe deeply."
  );

  // Create stretching block
  const { data: stretchBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "mobility",
      title: "Static Stretching",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (stretchBlock) {
    let order = 0;

    // Cat-Cow (spine mobility)
    const catCow = await findExercise(supabase, ["Cat-Cow"]);
    if (catCow) {
      await addItem(supabase, stretchBlock.id, catCow.id, order++, {
        duration: "1min",
        notes: "Slow breathing, gentle spinal movement"
      });
    }

    // Hip Flexor Stretch
    const hipFlexor = await findExercise(supabase, ["Hip Flexor Stretch"]);
    if (hipFlexor) {
      await addItem(supabase, stretchBlock.id, hipFlexor.id, order++, {
        duration: "1min",
        notes: "Each side, posterior pelvic tilt"
      });
    }

    // Glute Bridge (weighted activation exercise)
    const gluteBridge = await findExercise(supabase, ["Glute Bridge"]);
    if (gluteBridge) {
      // Calculate weight based on squat strength (10-20kg range)
      // Use 15-25% of squat 5RM, capped at 10-20kg
      const squat5rm = options.strengthData?.squat5rm || 60;
      const rawWeight = squat5rm * 0.20;
      // Glute Bridge is typically done with barbell, so use plate rounding (2.5kg increments)
      const gluteWeight = Math.max(10, Math.min(20, roundToPlateWeight(rawWeight)));
      
      await addItem(supabase, stretchBlock.id, gluteBridge.id, order++, {
        sets: 3,
        reps: 12,
        weight: gluteWeight,
        notes: "Weighted glute activation, squeeze at top"
      });
    }

    // Band Pull-Apart (shoulder health and upper body prehab)
    const bandPullApart = await findExercise(supabase, ["Band Pull-Apart", "Band Pull Apart"]);
    if (bandPullApart) {
      await addItem(supabase, stretchBlock.id, bandPullApart.id, order++, {
        sets: 2,
        reps: 15,
        notes: "Shoulder prehab, squeeze shoulder blades together"
      });
    }
  }

  console.log("✅ Post-Workout Mobility created");
}

/**
 * ACTIVE RECOVERY (30 min)
 * 
 * Full recovery session for rest days
 * Focus: Yoga flow, mobility drills, foam rolling
 */
async function buildActiveRecovery(
  supabase: SupabaseClient,
  planDayId: string,
  _options: RecoverySessionOptions
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Active Recovery",
    "Timed circuit: flow through each drill while the timer advances automatically. Focus on relaxed breathing and quality positions."
  );

  const { data: circuitBlock, error } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "circuit",
      title: "Mobility Flow Circuit",
      parameters: { format: "circuit", intensity: "easy" },
      rounds: 2,
      work_sec: 45,
      rest_sec: 15,
      rest_between_rounds_s: 60,
      order_index: 1,
    })
    .select()
    .single();

  if (error || !circuitBlock) {
    console.error("❌ Failed to create mobility circuit:", error);
    return;
  }

  let order = 0;
  for (const movement of TIMED_RECOVERY_SEQUENCE) {
    const exercise = await findExercise(supabase, movement.names);
    if (!exercise) continue;
    await addItem(supabase, circuitBlock.id, exercise.id, order++, {
      duration: movement.duration,
      notes: movement.notes,
    });
  }

  console.log("✅ Active Recovery session created with timed circuit");
}

async function buildLightMobilityFlow(
  supabase: SupabaseClient,
  planDayId: string
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Light Mobility Flow",
    "5-minute decompression flow. Move gently, breathe steadily, focus on range not intensity."
  );

  const { data: block, error } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "circuit",
      title: "5-Min Mobility",
      parameters: { format: "circuit", intensity: "easy" },
      rounds: 1,
      work_sec: 60,
      rest_sec: 0,
      order_index: 1,
    })
    .select()
    .single();

  if (error || !block) {
    console.error("❌ Failed to create light mobility block:", error);
    return;
  }

  let order = 0;
  for (const flow of LIGHT_MOBILITY_FLOW) {
    await supabase.from("session_block_items").insert({
      block_id: block.id,
      exercise_id: flow.id,
      item_order: order++,
      duration_sec: flow.durationSec,
      notes: flow.notes,
    });
  }

  console.log("✅ Light Mobility Flow created");
}

