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
    
    if (data) return data;
  }
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

    // Hip Flexor Stretch
    const hipFlexor = await findExercise(supabase, ["Hip Flexor Stretch"]);
    if (hipFlexor) {
      await addItem(supabase, stretchBlock.id, hipFlexor.id, order++, {
        duration: "60s",
        notes: "Posterior pelvic tilt, each side"
      });
    }

    // Hamstring Stretch
    const hamstring = await findExercise(supabase, ["Hamstring Stretch"]);
    if (hamstring) {
      await addItem(supabase, stretchBlock.id, hamstring.id, order++, {
        duration: "60s",
        notes: "Keep back straight, each side"
      });
    }

    // Quad Stretch
    const quad = await findExercise(supabase, ["Quad Stretch"]);
    if (quad) {
      await addItem(supabase, stretchBlock.id, quad.id, order++, {
        duration: "60s",
        notes: "Pull heel to glute, each side"
      });
    }

    // Figure 4 Glute Stretch
    const glute = await findExercise(supabase, ["Figure of 4 Stretch", "Figure 4 Glute Stretch (Left)"]);
    if (glute) {
      await addItem(supabase, stretchBlock.id, glute.id, order++, {
        duration: "60s",
        notes: "Seated or lying, each side"
      });
    }
  }

  // Create foam rolling block
  const { data: foamBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "mobility",
      title: "Foam Rolling",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (foamBlock) {
    let order = 0;

    // Cat-Cow (spine mobility)
    const catCow = await findExercise(supabase, ["Cat-Cow"]);
    if (catCow) {
      await addItem(supabase, foamBlock.id, catCow.id, order++, {
        duration: "90s",
        notes: "Slow breathing, gentle movement"
      });
    }

    // World's Greatest Stretch
    const worldsGreatest = await findExercise(supabase, ["World's Greatest Stretch"]);
    if (worldsGreatest) {
      await addItem(supabase, foamBlock.id, worldsGreatest.id, order++, {
        duration: "90s",
        notes: "Flow slowly, breathe deeply"
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
  const { data: yogaBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "mobility",
      title: "Yoga Flow",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (yogaBlock) {
    let order = 0;

    // Cat-Cow
    const catCow = await findExercise(supabase, ["Cat-Cow"]);
    if (catCow) {
      await addItem(supabase, yogaBlock.id, catCow.id, order++, {
        duration: "120s",
        notes: "Slow breathing, gentle spinal flexion/extension"
      });
    }

    // World's Greatest Stretch
    const worldsGreatest = await findExercise(supabase, ["World's Greatest Stretch"]);
    if (worldsGreatest) {
      await addItem(supabase, worldsGreatest.id, worldsGreatest.id, order++, {
        duration: "180s",
        notes: "Flow slowly, breathe deeply, each side"
      });
    }

    // Thoracic Rotation
    const thoracic = await findExercise(supabase, ["Thoracic Rotation (Open Book)"]);
    if (thoracic) {
      await addItem(supabase, yogaBlock.id, thoracic.id, order++, {
        duration: "120s",
        notes: "Slow rotations, breathe into stretch"
      });
    }

    // Standing Hip CARs
    const hipCars = await findExercise(supabase, ["Standing Hip CARs"]);
    if (hipCars) {
      await addItem(supabase, yogaBlock.id, hipCars.id, order++, {
        duration: "120s",
        notes: "Slow joint circles, each side"
      });
    }

    // 90/90 Hip Switches
    const hipSwitches = await findExercise(supabase, ["90/90 Hip Switches"]);
    if (hipSwitches) {
      await addItem(supabase, yogaBlock.id, hipSwitches.id, order++, {
        duration: "120s",
        notes: "Control, no pain, breathe"
      });
    }
  }

  // Create static stretching block
  const { data: stretchBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "mobility",
      title: "Deep Stretching",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (stretchBlock) {
    let order = 0;

    // Hip Flexor Stretch
    const hipFlexor = await findExercise(supabase, ["Hip Flexor Stretch"]);
    if (hipFlexor) {
      await addItem(supabase, stretchBlock.id, hipFlexor.id, order++, {
        duration: "90s",
        notes: "Posterior pelvic tilt, deep hold, each side"
      });
    }

    // Hamstring Stretch
    const hamstring = await findExercise(supabase, ["Hamstring Stretch"]);
    if (hamstring) {
      await addItem(supabase, stretchBlock.id, hamstring.id, order++, {
        duration: "90s",
        notes: "Keep back straight, relax into stretch, each side"
      });
    }

    // Cossack Squat
    const cossack = await findExercise(supabase, ["Cossack Squat"]);
    if (cossack) {
      await addItem(supabase, stretchBlock.id, cossack.id, order++, {
        duration: "120s",
        notes: "Heel down, upright chest, side to side"
      });
    }

    // Figure 4 Glute Stretch
    const glute = await findExercise(supabase, ["Figure of 4 Stretch"]);
    if (glute) {
      await addItem(supabase, stretchBlock.id, glute.id, order++, {
        duration: "90s",
        notes: "Seated or lying, deep hold, each side"
      });
    }
  }

  // Create activation/core block
  const { data: coreBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "mobility",
      title: "Light Core Activation",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (coreBlock) {
    let order = 0;

    // Bird Dog
    const birdDog = await findExercise(supabase, ["Bird Dog"]);
    if (birdDog) {
      await addItem(supabase, coreBlock.id, birdDog.id, order++, {
        duration: "90s",
        notes: "Reach long, hips level, controlled"
      });
    }

    // Dead Bug
    const deadBug = await findExercise(supabase, ["Dead Bug"]);
    if (deadBug) {
      await addItem(supabase, coreBlock.id, deadBug.id, order++, {
        duration: "90s",
        notes: "Low back gently down, breathe"
      });
    }

    // Glute Bridge
    const gluteBridge = await findExercise(supabase, ["Glute Bridge"]);
    if (gluteBridge) {
      await addItem(supabase, coreBlock.id, gluteBridge.id, order++, {
        duration: "90s",
        notes: "Squeeze glutes at top, slow tempo"
      });
    }
  }

  console.log("✅ Active Recovery created");
}

