/**
 * Recovery/Mobility Workout Generator
 * 
 * Generates recovery and mobility workouts for hybrid training programmes.
 * Supports: Post-Workout Mobility (10-15 min), Active Recovery (30 min)
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface RecoverySessionOptions {
  sessionType: "post-workout" | "active-recovery";
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
      .ilike("name", name)
      .limit(1)
      .single();
    
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
  options: RecoverySessionOptions
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Active Recovery",
    "Full recovery session to promote blood flow, reduce soreness, and maintain mobility. Move slowly and mindfully. This is not a workout - focus on feeling good, not working hard."
  );

  // Create yoga/mobility block
  const { data: yogaBlock, error: yogaError } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "mobility",
      title: "Yoga Flow",
      parameters: { format: "standard" },
      order_index: 1,
    })
    .select()
    .single();

  if (yogaError) {
    console.error("❌ Failed to create Yoga Flow block:", yogaError);
    throw yogaError;
  }

  if (yogaBlock) {
    let order = 0;

    // Inchworms (dynamic stretch) - NOT in post-workout
    const inchworms = await findExercise(supabase, ["Inchworms"]);
    if (inchworms) {
      await addItem(supabase, yogaBlock.id, inchworms.id, order++, {
        duration: "2min",
        notes: "6-8 reps, dynamic stretch for hamstrings and shoulders"
      });
    }

    // Thoracic Rotation - NOT in post-workout
    const thoracic = await findExercise(supabase, ["Thoracic Rotation (Open Book)"]);
    if (thoracic) {
      await addItem(supabase, yogaBlock.id, thoracic.id, order++, {
        duration: "2min",
        notes: "10 reps each side, slow rotations, breathe into stretch"
      });
    }

    // Standing Hip CARs - NOT in post-workout
    const hipCars = await findExercise(supabase, ["Standing Hip CARs"]);
    if (hipCars) {
      await addItem(supabase, yogaBlock.id, hipCars.id, order++, {
        duration: "2min",
        notes: "5 circles each direction, each leg"
      });
    }

    // 90/90 Hip Switches - NOT in post-workout
    const hipSwitches = await findExercise(supabase, ["90/90 Hip Switches"]);
    if (hipSwitches) {
      await addItem(supabase, yogaBlock.id, hipSwitches.id, order++, {
        duration: "2min",
        notes: "10-12 switches, control, no pain, breathe"
      });
    }
  }

  // Create static stretching block
  const { data: stretchBlock, error: stretchError } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "mobility",
      title: "Deep Stretching",
      parameters: { format: "standard" },
      order_index: 2,
    })
    .select()
    .single();

  if (stretchError) {
    console.error("❌ Failed to create Deep Stretching block:", stretchError);
    throw stretchError;
  }

  if (stretchBlock) {
    let order = 0;

    // Hamstring Stretch - NOT in post-workout
    const hamstring = await findExercise(supabase, ["Hamstring Stretch"]);
    if (hamstring) {
      await addItem(supabase, stretchBlock.id, hamstring.id, order++, {
        duration: "2min",
        notes: "Keep back straight, relax into stretch, each side"
      });
    }

    // Quad Stretch - NOT in post-workout
    const quad = await findExercise(supabase, ["Quad Stretch"]);
    if (quad) {
      await addItem(supabase, stretchBlock.id, quad.id, order++, {
        duration: "2min",
        notes: "Pull heel to glute, keep knees together, each side"
      });
    }

    // Cossack Squat - NOT in post-workout
    const cossack = await findExercise(supabase, ["Cossack Squat"]);
    if (cossack) {
      await addItem(supabase, stretchBlock.id, cossack.id, order++, {
        duration: "2min",
        notes: "8-10 reps, heel down, upright chest, side to side"
      });
    }

    // Figure 4 Glute Stretch - NOT in post-workout
    const glute = await findExercise(supabase, ["Figure of 4 Stretch"]);
    if (glute) {
      await addItem(supabase, stretchBlock.id, glute.id, order++, {
        duration: "2min",
        notes: "Seated or lying, deep hold, each side"
      });
    }
  }

  // Create activation/core block
  const { data: coreBlock, error: coreError } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "mobility",
      title: "Light Core Activation",
      parameters: { format: "standard" },
      order_index: 3,
    })
    .select()
    .single();

  if (coreError) {
    console.error("❌ Failed to create Light Core Activation block:", coreError);
    throw coreError;
  }

  if (coreBlock) {
    let order = 0;

    // Bird Dog - NOT in post-workout
    const birdDog = await findExercise(supabase, ["Bird Dog"]);
    if (birdDog) {
      await addItem(supabase, coreBlock.id, birdDog.id, order++, {
        duration: "2min",
        notes: "10 reps each side, reach long, hips level, controlled"
      });
    }

    // Dead Bug - NOT in post-workout
    const deadBug = await findExercise(supabase, ["Dead Bug"]);
    if (deadBug) {
      await addItem(supabase, coreBlock.id, deadBug.id, order++, {
        duration: "2min",
        notes: "10 reps each side, low back gently down, breathe"
      });
    }

    // Plank - NOT in post-workout (replaces Glute Bridge to avoid duplication)
    const plank = await findExercise(supabase, ["Plank"]);
    if (plank) {
      await addItem(supabase, coreBlock.id, plank.id, order++, {
        duration: "1min",
        notes: "Hold strong position, breathe steadily"
      });
    }

    // Ankle Dorsiflexion Mobilization (ankle mobility and balance)
    const ankleDorsi = await findExercise(supabase, ["Ankle Dorsiflexion Mobilization", "Ankle Dorsiflexion"]);
    if (ankleDorsi) {
      await addItem(supabase, coreBlock.id, ankleDorsi.id, order++, {
        duration: "2min",
        notes: "Each ankle, improve range of motion for squats and running"
      });
    }

    // Foam Roller on Mid Back (recovery and posture reset)
    const foamRoller = await findExercise(supabase, ["Foam Roller on Mid Back", "Foam Roller Mid Back"]);
    if (foamRoller) {
      await addItem(supabase, coreBlock.id, foamRoller.id, order++, {
        duration: "2min",
        notes: "Gentle rolling, release tension, improve posture"
      });
    }
  }

  console.log("✅ Active Recovery created");
}

