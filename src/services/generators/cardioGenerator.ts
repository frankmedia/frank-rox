/**
 * Cardio/Conditioning Workout Generator
 * 
 * Generates cardio and conditioning workouts for hybrid training programmes.
 * Supports: Race Simulation, Engine Work, HIIT Conditioning
 */

import { SupabaseClient } from "@supabase/supabase-js";

export interface CardioSessionOptions {
  sessionType: "race-simulation" | "engine-work" | "hiit";
  duration?: number; // minutes
  intensity?: "easy" | "moderate" | "hard";
  equipment?: string[]; // Available equipment
  allowRunning?: boolean; // If false, replace runs with erg alternatives
}

/**
 * Main entry point for creating cardio sessions
 */
export async function createCardioSession(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions
): Promise<void> {
  console.log(`🏃 Creating ${options.sessionType} cardio session`);

  switch (options.sessionType) {
    case "race-simulation":
      await buildRaceSimulation(supabase, planDayId, options);
      break;
    case "engine-work":
      await buildEngineWork(supabase, planDayId, options);
      break;
    case "hiit":
      await buildHIIT(supabase, planDayId, options);
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
      order_index: 1,
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

  // Parse and populate columns
  if (extra.sets) payload.sets = extra.sets;
  if (extra.reps) payload.reps = extra.reps;
  
  if (extra.distance) {
    const distStr = String(extra.distance);
    const distMatch = distStr.match(/(\d+(?:\.\d+)?)\s*(m|km)/i);
    if (distMatch) {
      const value = parseFloat(distMatch[1]);
      const unit = distMatch[2].toLowerCase();
      payload.distance_m = Math.round(unit === 'km' ? value * 1000 : value);
    }
  }
  
  if (extra.duration) {
    const durStr = String(extra.duration);
    const durMatch = durStr.match(/(\d+)\s*min/i);
    if (durMatch) {
      payload.duration_sec = parseInt(durMatch[1]); // Store as minutes for cardio
    }
  }
  
  if (extra.rest) {
    const restMatch = extra.rest.match(/(\d+)\s*(s|sec|min)/i);
    if (restMatch) {
      const value = parseInt(restMatch[1]);
      const unit = restMatch[2].toLowerCase();
      payload.rest_sec = unit.startsWith('min') ? value * 60 : value;
    }
  }
  
  if (extra.notes) payload.notes = extra.notes;
  if (Object.keys(extra).length) payload.extra = extra;

  const res = await supabase.from("session_block_items").insert(payload);
  if (res.error) throw res.error;
}

/**
 * RACE SIMULATION
 * 
 * Format: Circuit with multiple modalities
 * Example: 4 rounds of (1km run + 50m sled push + 500m SkiErg)
 */
async function buildRaceSimulation(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Race Simulation",
    "Hybrid conditioning circuit combining running, strength, and erg work. Maintain consistent pacing across all rounds. This simulates race-day demands with mixed modalities."
  );

  // Create warm-up block
  const { data: warmupBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Warm-up",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (warmupBlock) {
    // Use erg alternative if running not allowed
    if (options.allowRunning === false) {
      const bike = await findExercise(supabase, ["Assault Bike", "Air Bike", "Bike"]);
      if (bike) {
        await addItem(supabase, warmupBlock.id, bike.id, 0, {
          duration: "10min",
          notes: "Easy pace warm-up (no-running alternative)"
        });
      }
    } else {
      const easyRun = await findExercise(supabase, ["Easy Z2 Run", "Treadmill Easy Run (Z2)", "Run"]);
      if (easyRun) {
        await addItem(supabase, warmupBlock.id, easyRun.id, 0, {
          duration: "10min",
          notes: "Easy pace warm-up"
        });
      }
    }
  }

  // Create main circuit block
  const { data: circuitBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Race Simulation Circuit",
      rounds: 4,
      rest_between_rounds_s: 180, // 3 min rest
      parameters: { 
        format: "circuit",
        intensity: "hard"
      },
    })
    .select()
    .single();

  if (circuitBlock) {
    let order = 0;

    // 1. Run (or RowErg alternative if running not allowed)
    if (options.allowRunning === false) {
      const rower = await findExercise(supabase, ["RowErg", "Rower", "Rowing Machine"]);
      if (rower) {
        await addItem(supabase, circuitBlock.id, rower.id, order++, {
          distance: "1km",
          notes: "Hard pace - maintain consistency (no-running alternative)"
        });
      }
    } else {
      const run = await findExercise(supabase, ["Run", "1km Run Hyrox Pace"]);
      if (run) {
        await addItem(supabase, circuitBlock.id, run.id, order++, {
          distance: "1km",
          notes: "Race pace - maintain consistency"
        });
      }
    }

    // 2. Sled Push
    const sledPush = await findExercise(supabase, ["Sled Push"]);
    if (sledPush) {
      await addItem(supabase, circuitBlock.id, sledPush.id, order++, {
        distance: "50m",
        notes: "Fast short steps, drive through legs"
      });
    }

    // 3. SkiErg
    const skierg = await findExercise(supabase, ["SkiErg"]);
    if (skierg) {
      await addItem(supabase, circuitBlock.id, skierg.id, order++, {
        distance: "500m",
        notes: "Tall catch, lats engaged, consistent pace"
      });
    }
  }

  // Create cool-down block
  const { data: cooldownBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Cool-down",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (cooldownBlock) {
    const easyWalk = await findExercise(supabase, ["Easy Walk", "Treadmill Easy Run (Z2)"]);
    if (easyWalk) {
      await addItem(supabase, cooldownBlock.id, easyWalk.id, 0, {
        duration: "5min",
        notes: "Easy pace to bring heart rate down"
      });
    }
  }

  console.log("✅ Race Simulation created");
}

/**
 * ENGINE WORK
 * 
 * Format: Mixed intervals on different machines
 * Example: 30 min rotating between RowErg, SkiErg, Assault Bike
 */
async function buildEngineWork(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions
) {
  const duration = options.duration || 30;
  
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Engine Work",
    "Mixed cardio intervals to build aerobic capacity across multiple modalities. Focus on maintaining consistent effort, not max output. Build your engine with varied movement patterns."
  );

  // Create warm-up block
  const { data: warmupBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Warm-up",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (warmupBlock) {
    // Use erg alternative if running not allowed
    if (options.allowRunning === false) {
      const rower = await findExercise(supabase, ["RowErg", "Rower", "Rowing Machine"]);
      if (rower) {
        await addItem(supabase, warmupBlock.id, rower.id, 0, {
          duration: "5min",
          notes: "Easy pace warm-up (no-running alternative)"
        });
      }
    } else {
      const easyRun = await findExercise(supabase, ["Easy Z2 Run", "Treadmill Easy Run (Z2)"]);
      if (easyRun) {
        await addItem(supabase, warmupBlock.id, easyRun.id, 0, {
          duration: "5min",
          notes: "Easy pace warm-up"
        });
      }
    }
  }

  // Create interval blocks for each machine
  const machines = [
    { name: "RowErg", exercise: ["RowErg"], notes: "Even split pacing, 20-24 spm" },
    { name: "SkiErg", exercise: ["SkiErg"], notes: "Tall catch, lats engaged" },
    { name: "Assault Bike", exercise: ["Assault Bike", "BikeErg Steady Z2"], notes: "Powerful arms + legs" },
  ];

  const intervalsPerMachine = Math.floor(duration / 10); // ~10 min per machine

  for (let i = 0; i < machines.length; i++) {
    const machine = machines[i];
    
    const { data: intervalBlock } = await supabase
      .from("session_blocks")
      .insert({
        session_id: sessionData.id,
        block_type: "cardio",
        title: `${machine.name} Intervals`,
        rounds: intervalsPerMachine,
        parameters: { 
          format: "intervals",
          work_sec: 120, // 2 min work
          rest_sec: 60,  // 1 min rest
          intensity: "moderate"
        },
      })
      .select()
      .single();

    if (intervalBlock) {
      const exercise = await findExercise(supabase, machine.exercise);
      if (exercise) {
        await addItem(supabase, intervalBlock.id, exercise.id, 0, {
          duration: "2min",
          rest: "60s",
          notes: machine.notes
        });
      }
    }
  }

  // Create cool-down block
  const { data: cooldownBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Cool-down",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (cooldownBlock) {
    const easyWalk = await findExercise(supabase, ["Easy Walk"]);
    if (easyWalk) {
      await addItem(supabase, cooldownBlock.id, easyWalk.id, 0, {
        duration: "5min",
        notes: "Easy pace to bring heart rate down"
      });
    }
  }

  console.log("✅ Engine Work created");
}

/**
 * HIIT CONDITIONING
 * 
 * Format: Short bursts with short rest
 * Example: 8 rounds of 30s SkiErg / 30s rest
 */
async function buildHIIT(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "HIIT Conditioning",
    "High-intensity interval training to improve anaerobic capacity and power output. Go hard on work periods, use rest to recover fully. Quality over quantity - maintain intensity throughout."
  );

  // Create warm-up block
  const { data: warmupBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Warm-up",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (warmupBlock) {
    const jumpingJacks = await findExercise(supabase, ["Jumping Jacks"]);
    if (jumpingJacks) {
      await addItem(supabase, warmupBlock.id, jumpingJacks.id, 0, {
        duration: "3min",
        notes: "Light impact warm-up"
      });
    }
  }

  // Create HIIT blocks
  const hiitExercises = [
    { name: ["SkiErg"], notes: "Max effort, tall catch", rounds: 8, work: 30, rest: 30 },
    { name: ["Burpees"], notes: "Fast pace, full extension", rounds: 6, work: 40, rest: 20 },
    { name: ["Assault Bike"], notes: "All-out effort", rounds: 10, work: 20, rest: 40 },
  ];

  for (const hiit of hiitExercises) {
    const { data: hiitBlock } = await supabase
      .from("session_blocks")
      .insert({
        session_id: sessionData.id,
        block_type: "cardio",
        title: `HIIT: ${hiit.name[0]}`,
        rounds: hiit.rounds,
        parameters: { 
          format: "hiit",
          work_sec: hiit.work,
          rest_sec: hiit.rest,
          intensity: "hard"
        },
      })
      .select()
      .single();

    if (hiitBlock) {
      const exercise = await findExercise(supabase, hiit.name);
      if (exercise) {
        await addItem(supabase, hiitBlock.id, exercise.id, 0, {
          duration: `${hiit.work}s`,
          rest: `${hiit.rest}s`,
          notes: hiit.notes
        });
      }
    }

    // Add 2 min rest between HIIT blocks
    const { data: restBlock } = await supabase
      .from("session_blocks")
      .insert({
        session_id: sessionData.id,
        block_type: "cardio",
        title: "Active Rest",
        parameters: { format: "standard" },
      })
      .select()
      .single();

    if (restBlock) {
      const walk = await findExercise(supabase, ["Easy Walk"]);
      if (walk) {
        await addItem(supabase, restBlock.id, walk.id, 0, {
          duration: "2min",
          notes: "Walk to recover between blocks"
        });
      }
    }
  }

  // Create cool-down block
  const { data: cooldownBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Cool-down",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (cooldownBlock) {
    const easyWalk = await findExercise(supabase, ["Easy Walk"]);
    if (easyWalk) {
      await addItem(supabase, cooldownBlock.id, easyWalk.id, 0, {
        duration: "5min",
        notes: "Easy pace to bring heart rate down"
      });
    }
  }

  console.log("✅ HIIT Conditioning created");
}

