/**
 * Cardio/Conditioning Workout Generator
 * 
 * Generates 12 Hyrox-style cardio workouts:
 * - 10 equipment-based workouts
 * - 2 bodyweight-only workouts
 */

import { SupabaseClient } from "@supabase/supabase-js";
import { CardioWorkoutType } from "../cardioWorkoutSelector";

// Exercise IDs - use these instead of findExercise to avoid matching wrong exercises
const ROWERG_ID = "d8f8bf07-c315-40a4-ae0c-b3fcb4db74e2"; // RowErg (not "RowErg Intervals 40/20")
const SKIERG_ID = "917c05c6-5adf-4d3b-887e-ff2a292fa079"; // SkiErg (not "SkiErg 50/10 Intervals")

export interface CardioSessionOptions {
  sessionType: CardioWorkoutType;
  duration?: number; // minutes
  intensity?: "easy" | "moderate" | "hard";
  equipment?: string[]; // Available equipment
  allowRunning?: boolean; // If false, replace runs with erg alternatives
  intensityModifier?: number; // Progressive overload multiplier (1.0 = base, 1.1 = +10%)
}

/**
 * Main entry point for creating cardio sessions
 */
export async function createCardioSession(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions
): Promise<void> {
  console.log(`🏃 Creating ${options.sessionType} cardio session (modifier: ${options.intensityModifier || 1.0})`);

  const modifier = options.intensityModifier || 1.0;

  switch (options.sessionType) {
    case "machine-endurance":
      await buildMachineEndurance(supabase, planDayId, options, modifier);
      break;
    case "ski-row-threshold":
      await buildSkiRowThreshold(supabase, planDayId, options, modifier);
      break;
    case "functional-engine":
      await buildFunctionalEngine(supabase, planDayId, options, modifier);
      break;
    case "machine-power":
      await buildMachinePower(supabase, planDayId, options, modifier);
      break;
    case "sled-ski-combo":
      await buildSledSkiCombo(supabase, planDayId, options, modifier);
      break;
    case "descending-ladder":
      await buildDescendingLadder(supabase, planDayId, options, modifier);
      break;
    case "assault-gauntlet":
      await buildAssaultGauntlet(supabase, planDayId, options, modifier);
      break;
    case "hybrid-pyramid":
      await buildHybridPyramid(supabase, planDayId, options, modifier);
      break;
    case "lactic-threshold":
      await buildLacticThreshold(supabase, planDayId, options, modifier);
      break;
    case "hyrox-finisher":
      await buildHyroxFinisher(supabase, planDayId, options, modifier);
      break;
    case "bodyweight-grinder":
      await buildBodyweightGrinder(supabase, planDayId, options, modifier);
      break;
    case "bodyweight-power":
      await buildBodyweightPower(supabase, planDayId, options, modifier);
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
      payload.duration_sec = parseInt(durMatch[1]) * 60;
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
 * 1. MACHINE ENDURANCE BUILDER
 * 45-60 minutes steady state (Zone 2-3)
 */
async function buildMachineEndurance(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const totalDuration = options.duration || 50; // Total session duration in minutes
  const numMachines = 4; // SkiErg, RowErg, Bike, Cross Trainer
  const durationPerMachine = Math.round((totalDuration / numMachines) * modifier);
  
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Machine Endurance Builder",
    `${totalDuration} minutes steady state aerobic work. Keep heart rate in Zone 2-3 (conversational pace). Build your aerobic base across multiple modalities.`
  );

  const duration = durationPerMachine; // Duration per machine

  // Create main block
  const { data: mainBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Steady State Endurance",
      parameters: { format: "standard", intensity: "easy" },
    })
    .select()
    .single();

  if (mainBlock) {
    let order = 0;

    // Use direct IDs to avoid matching "SkiErg 50/10 Intervals"
    await addItem(supabase, mainBlock.id, SKIERG_ID, order++, {
      duration: `${duration}min`,
      notes: "Zone 2-3, tall catch, lats engaged"
    });

    // Use direct ID to avoid matching "RowErg Intervals 40/20"
    await addItem(supabase, mainBlock.id, ROWERG_ID, order++, {
      duration: `${duration}min`,
      notes: "Zone 2-3, even splits, 20-24 spm"
    });

    const bike = await findExercise(supabase, ["Assault Bike", "BikeErg Steady Z2"]);
    if (bike) {
      await addItem(supabase, mainBlock.id, bike.id, order++, {
        duration: `${duration}min`,
        notes: "Zone 2-3, smooth cadence"
      });
    }

    const crossTrainer = await findExercise(supabase, ["Cross Trainer", "Elliptical"]);
    if (crossTrainer) {
      await addItem(supabase, mainBlock.id, crossTrainer.id, order++, {
        duration: `${duration}min`,
        notes: "Zone 2-3, full range of motion"
      });
    }
  }

  console.log("✅ Machine Endurance Builder created");
}

/**
 * 2. SKI-ROW THRESHOLD
 * 6-8 rounds: 1000m Ski + 1000m Row + 20 Air Squats + 20 Wall Balls
 */
async function buildSkiRowThreshold(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const totalDuration = options.duration || 50; // Total session duration
  // Each circuit = 3 rounds × ~6 min = 18 minutes MAX
  // For 50 min session, we need 2-3 circuits with rest between
  const numCircuits = Math.max(2, Math.round(totalDuration / 20));
  
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Ski-Row Threshold",
    `${totalDuration} minute threshold work: ${numCircuits} circuits of erg work and functional movements. Rest 3-4 min between circuits.`
  );

  const roundsPerCircuit = 3; // Keep circuits to 15-20 min MAX
  const distance = Math.round(1000 * modifier);
  const wallBalls = Math.round(20 * modifier);

  // Create multiple circuits (15-20 min each)
  for (let circuitNum = 1; circuitNum <= numCircuits; circuitNum++) {
    const { data: circuitBlock } = await supabase
      .from("session_blocks")
      .insert({
        session_id: sessionData.id,
        block_type: "cardio",
        title: `Circuit ${circuitNum}/${numCircuits}`,
        rounds: roundsPerCircuit,
        rest_between_rounds_s: 90, // 90s rest between rounds
        parameters: { format: "circuit", intensity: "hard" },
      })
      .select()
      .single();

    if (circuitBlock) {
      let order = 0;

      await addItem(supabase, circuitBlock.id, SKIERG_ID, order++, {
        distance: `${distance}m`,
        notes: "Consistent splits, tall catch"
      });

      await addItem(supabase, circuitBlock.id, ROWERG_ID, order++, {
        distance: `${distance}m`,
        notes: "Even pacing, 20-24 spm"
      });

      // Add Air Squats for cardio conditioning
      const AIR_SQUAT_ID = "d035abfc-002c-438d-933f-4c304accb805";
      const { data: airSquat } = await supabase
        .from("exercises")
        .select("id, name")
        .eq("id", AIR_SQUAT_ID)
        .single();
      
      if (airSquat) {
        await addItem(supabase, circuitBlock.id, airSquat.id, order++, {
          reps: 20,
          notes: "Fast tempo, full depth, cardio conditioning"
        });
      }

      const wallBall = await findExercise(supabase, ["Wall Balls", "Wall Ball"]);
      if (wallBall) {
        await addItem(supabase, circuitBlock.id, wallBall.id, order++, {
          reps: wallBalls,
          notes: "Full depth squat, hit target"
        });
      }
    }
  }

  console.log(`✅ Ski-Row Threshold created with ${numCircuits} circuits`);
}

/**
 * 3. FUNCTIONAL ENGINE AMRAP
 * 30min AMRAP: Row, Lunges, Burpees, KB, Wall Balls
 */
async function buildFunctionalEngine(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Functional Engine AMRAP",
    "30-minute AMRAP for max rounds. Sustainable pace - this is about volume and consistency, not sprinting. Build your work capacity across mixed modalities."
  );

  const duration = Math.round(30 * modifier);

  // Create AMRAP block
  const { data: amrapBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: `${duration} min AMRAP`,
      parameters: { format: "amrap", time_cap_min: duration, intensity: "moderate" },
    })
    .select()
    .single();

  if (amrapBlock) {
    let order = 0;

    await addItem(supabase, amrapBlock.id, ROWERG_ID, order++, {
      distance: "500m",
      notes: "Steady pace"
    });

    const lunges = await findExercise(supabase, ["Walking Lunges", "Lunges"]);
    if (lunges) {
      await addItem(supabase, amrapBlock.id, lunges.id, order++, {
        reps: 20,
        notes: "10 each leg, weighted optional"
      });
    }

    const burpees = await findExercise(supabase, ["Burpees"]);
    if (burpees) {
      await addItem(supabase, amrapBlock.id, burpees.id, order++, {
        reps: 15,
        notes: "Full chest to deck"
      });
    }

    const kbSwing = await findExercise(supabase, ["Kettlebell Swing", "KB Swing"]);
    if (kbSwing) {
      await addItem(supabase, amrapBlock.id, kbSwing.id, order++, {
        reps: 20,
        notes: "24/16kg, hip drive"
      });
    }

    const wallBall = await findExercise(supabase, ["Wall Balls"]);
    if (wallBall) {
      await addItem(supabase, amrapBlock.id, wallBall.id, order++, {
        reps: 15,
        notes: "Full depth squat"
      });
    }
  }

  console.log("✅ Functional Engine AMRAP created");
}

/**
 * 4. MACHINE POWER INTERVALS
 * 6 rounds: 1min Ski/Row/Bike (hard) + 1min rest
 */
async function buildMachinePower(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Machine Power Intervals",
    "High-intensity intervals across three machines. Go hard on work periods, use rest to recover fully. Aim for equal power output across all machines."
  );

  const rounds = Math.round(6 * modifier);

  const machines = [
    { name: "SkiErg", exercise: ["SkiErg"], notes: "Max effort, tall catch" },
    { name: "RowErg", exercise: ["RowErg"], notes: "Hard pace, 26-30 spm" },
    { name: "Assault Bike", exercise: ["Assault Bike"], notes: "All-out, arms + legs" },
  ];

  for (const machine of machines) {
    const { data: intervalBlock } = await supabase
      .from("session_blocks")
      .insert({
        session_id: sessionData.id,
        block_type: "cardio",
        title: `${machine.name} Intervals`,
        rounds: rounds,
        parameters: { 
          format: "intervals",
          work_sec: 60,
          rest_sec: 60,
          intensity: "hard"
        },
      })
      .select()
      .single();

    if (intervalBlock) {
      const exercise = await findExercise(supabase, machine.exercise);
      if (exercise) {
        await addItem(supabase, intervalBlock.id, exercise.id, 0, {
          duration: "1min",
          rest: "60s",
          notes: machine.notes
        });
      }
    }
  }

  console.log("✅ Machine Power Intervals created");
}

/**
 * 5. SLED & SKI COMBO
 * 5 rounds: 250m Ski + Sled Push/Pull + Air Squats
 */
async function buildSledSkiCombo(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Sled & Ski Combo",
    "Power endurance combining erg work and sled. Race-sim style - maintain intensity across all rounds. Fast short steps on sled, drive through legs."
  );

  const rounds = Math.round(5 * modifier);
  const skiDistance = Math.round(250 * modifier);
  const sledDistance = Math.round(15 * modifier);

  const { data: circuitBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Sled & Ski Circuit",
      rounds: rounds,
      rest_between_rounds_s: 90,
      parameters: { format: "circuit", intensity: "hard" },
    })
    .select()
    .single();

  if (circuitBlock) {
    let order = 0;

    await addItem(supabase, circuitBlock.id, SKIERG_ID, order++, {
      distance: `${skiDistance}m`,
      notes: "Fast pace"
    });

    const sledPush = await findExercise(supabase, ["Sled Push"]);
    if (sledPush) {
      await addItem(supabase, circuitBlock.id, sledPush.id, order++, {
        distance: `${sledDistance}m`,
        notes: "Heavy load, fast short steps"
      });
    }

    const sledPull = await findExercise(supabase, ["Sled Pull"]);
    if (sledPull) {
      await addItem(supabase, circuitBlock.id, sledPull.id, order++, {
        distance: `${sledDistance}m`,
        notes: "Moderate load, steady pull"
      });
    }

    // Use specific Air Squat ID for consistency
    const AIR_SQUAT_ID = "d035abfc-002c-438d-933f-4c304accb805";
    const { data: airSquats } = await supabase
      .from("exercises")
      .select("id, name")
      .eq("id", AIR_SQUAT_ID)
      .single();
    
    if (airSquats) {
      await addItem(supabase, circuitBlock.id, airSquats.id, order++, {
        reps: 15,
        notes: "Full depth, explosive, cardio conditioning"
      });
    }
  }

  console.log("✅ Sled & Ski Combo created");
}

/**
 * 6. DESCENDING LADDER
 * 10-8-6-4-2: 250m Ski/Row + 10 Burpees
 */
async function buildDescendingLadder(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Descending Ladder",
    "Ladder format with decreasing rounds. Total body effort - pace should increase as rounds decrease. Rest 60 seconds between rounds."
  );

  const rounds = [10, 8, 6, 4, 2];

  for (let i = 0; i < rounds.length; i++) {
    const roundNum = rounds[i];
    
    const { data: roundBlock } = await supabase
      .from("session_blocks")
      .insert({
        session_id: sessionData.id,
        block_type: "cardio",
        title: `Round ${roundNum}`,
        parameters: { format: "standard", intensity: "moderate" },
      })
      .select()
      .single();

    if (roundBlock) {
      let order = 0;

      await addItem(supabase, roundBlock.id, SKIERG_ID, order++, {
        distance: "250m",
        notes: "Fast pace"
      });

      await addItem(supabase, roundBlock.id, ROWERG_ID, order++, {
        distance: "250m",
        notes: "Fast pace"
      });

      const burpees = await findExercise(supabase, ["Burpees"]);
      if (burpees) {
        await addItem(supabase, roundBlock.id, burpees.id, order++, {
          reps: 10,
          notes: "Full chest to deck"
        });
      }
    }
  }

  console.log("✅ Descending Ladder created");
}

/**
 * 7. ASSAULT GAUNTLET
 * EMOM 5min x6: 20cal Bike + Jump Squats + KB DL
 */
async function buildAssaultGauntlet(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Assault Gauntlet",
    "EMOM format - complete work, rest remainder of each 5-minute window. Work hard, recover fully. Teaches pacing under fatigue."
  );

  const rounds = Math.round(6 * modifier);
  const cals = Math.round(20 * modifier);

  const { data: emomBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "EMOM 5min",
      rounds: rounds,
      parameters: { 
        format: "emom",
        interval_sec: 300, // 5 minutes
        intensity: "hard"
      },
    })
    .select()
    .single();

  if (emomBlock) {
    let order = 0;

    const bike = await findExercise(supabase, ["Assault Bike"]);
    if (bike) {
      await addItem(supabase, emomBlock.id, bike.id, order++, {
        reps: cals,
        notes: `${cals} calories, all-out effort`
      });
    }

    const jumpSquats = await findExercise(supabase, ["Jump Squats", "Jumping Squats"]);
    if (jumpSquats) {
      await addItem(supabase, emomBlock.id, jumpSquats.id, order++, {
        reps: 15,
        notes: "Explosive, full extension"
      });
    }

    const kbDeadlift = await findExercise(supabase, ["KB Deadlifts", "Kettlebell Deadlifts"]);
    if (kbDeadlift) {
      await addItem(supabase, emomBlock.id, kbDeadlift.id, order++, {
        reps: 15,
        notes: "Heavy KB, hip hinge"
      });
    }
  }

  console.log("✅ Assault Gauntlet created");
}

/**
 * 8. HYBRID PYRAMID
 * Pyramid: 250-500-750-1000-750-500-250 (Ski/Row/Bike)
 */
async function buildHybridPyramid(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Hybrid Pyramid",
    "Pyramid format for aerobic development. Controlled pacing - steady effort throughout. Build up, then back down."
  );

  const distances = [250, 500, 750, 1000, 750, 500, 250];
  const machines = ["SkiErg", "RowErg", "Assault Bike"];

  for (let i = 0; i < distances.length; i++) {
    const distance = Math.round(distances[i] * modifier);
    const machine = machines[i % machines.length];
    
    const { data: roundBlock } = await supabase
      .from("session_blocks")
      .insert({
        session_id: sessionData.id,
        block_type: "cardio",
        title: `${distance}m ${machine}`,
        parameters: { format: "standard", intensity: "easy" },
      })
      .select()
      .single();

    if (roundBlock) {
      const exercise = await findExercise(supabase, [machine]);
      if (exercise) {
        await addItem(supabase, roundBlock.id, exercise.id, 0, {
          distance: `${distance}m`,
          notes: "Steady pace, controlled breathing"
        });
      }
    }
  }

  console.log("✅ Hybrid Pyramid created");
}

/**
 * 9. LACTIC THRESHOLD BUILDER
 * 3 rounds: 500m Row + Burpees + 250m Ski + KB Swings
 */
async function buildLacticThreshold(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Lactic Threshold Builder",
    "Short rests, teaches tolerance under fatigue. Zone 4-5 pace on ergs. This is about pushing through discomfort and maintaining output."
  );

  const rounds = Math.round(3 * modifier);

  const { data: circuitBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Threshold Circuit",
      rounds: rounds,
      rest_between_rounds_s: 90,
      parameters: { format: "circuit", intensity: "hard" },
    })
    .select()
    .single();

  if (circuitBlock) {
    let order = 0;

    await addItem(supabase, circuitBlock.id, ROWERG_ID, order++, {
      distance: "500m",
      notes: "Z4 pace, hard effort"
    });

    const burpeesOver = await findExercise(supabase, ["Burpees Over Rower", "Burpees"]);
    if (burpeesOver) {
      await addItem(supabase, circuitBlock.id, burpeesOver.id, order++, {
        reps: 15,
        notes: "Fast pace, jump over"
      });
    }

    // Add Air Squats for cardio conditioning
    const AIR_SQUAT_ID = "d035abfc-002c-438d-933f-4c304accb805";
    const { data: airSquat } = await supabase
      .from("exercises")
      .select("id, name")
      .eq("id", AIR_SQUAT_ID)
      .single();
    
    if (airSquat) {
      await addItem(supabase, circuitBlock.id, airSquat.id, order++, {
        reps: 20,
        notes: "Explosive tempo, full ROM, maintain pace"
      });
    }

    await addItem(supabase, circuitBlock.id, SKIERG_ID, order++, {
      distance: "250m",
      notes: "Z5 pace, max effort"
    });

    const kbSwing = await findExercise(supabase, ["KB Swings"]);
    if (kbSwing) {
      await addItem(supabase, circuitBlock.id, kbSwing.id, order++, {
        reps: 15,
        notes: "Heavy KB, explosive"
      });
    }
  }

  console.log("✅ Lactic Threshold Builder created");
}

/**
 * 10. FULL HYROX FINISHER
 * 4 rounds: 1000m Ski + Wall Balls + Burpees + Sled
 */
async function buildHyroxFinisher(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Full Hyrox Finisher",
    "Simulates Hyrox effort, minus the running legs. 4 rounds for time - this is a race simulation. Maintain intensity, manage fatigue."
  );

  const rounds = Math.round(4 * modifier);
  const skiDistance = Math.round(1000 * modifier);

  const { data: circuitBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Hyrox Simulation",
      rounds: rounds,
      rest_between_rounds_s: 180,
      parameters: { format: "circuit", intensity: "hard" },
    })
    .select()
    .single();

  if (circuitBlock) {
    let order = 0;

    await addItem(supabase, circuitBlock.id, SKIERG_ID, order++, {
      distance: `${skiDistance}m`,
      notes: "Race pace, consistent splits"
    });

    const wallBall = await findExercise(supabase, ["Wall Balls"]);
    if (wallBall) {
      await addItem(supabase, circuitBlock.id, wallBall.id, order++, {
        reps: 20,
        notes: "Full depth, hit target"
      });
    }

    const burpeeBroad = await findExercise(supabase, ["Burpee Broad Jumps", "Burpees"]);
    if (burpeeBroad) {
      await addItem(supabase, circuitBlock.id, burpeeBroad.id, order++, {
        reps: 15,
        notes: "Explosive, max distance"
      });
    }

    const sledPush = await findExercise(supabase, ["Sled Push"]);
    if (sledPush) {
      await addItem(supabase, circuitBlock.id, sledPush.id, order++, {
        distance: "50m",
        notes: "Heavy load, drive hard"
      });
    }

    const sledPull = await findExercise(supabase, ["Sled Pull"]);
    if (sledPull) {
      await addItem(supabase, circuitBlock.id, sledPull.id, order++, {
        distance: "50m",
        notes: "Steady pull, maintain tension"
      });
    }
  }

  console.log("✅ Full Hyrox Finisher created");
}

/**
 * 11. BODYWEIGHT GRINDER
 * 4 rounds: Jump Squats, Burpees, Lunges, Broad Jumps, Plank
 */
async function buildBodyweightGrinder(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Bodyweight Grinder",
    "No equipment needed. 4 rounds for time - keep moving, focus on consistent pacing and full range of motion. Great for aerobic conditioning and muscular endurance."
  );

  const rounds = Math.round(4 * modifier);

  const { data: circuitBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Bodyweight Circuit",
      rounds: rounds,
      rest_between_rounds_s: 90,
      parameters: { format: "circuit", intensity: "moderate" },
    })
    .select()
    .single();

  if (circuitBlock) {
    let order = 0;

    // Use specific Air Squat ID for consistency
    const AIR_SQUAT_ID = "d035abfc-002c-438d-933f-4c304accb805";
    const { data: airSquats } = await supabase
      .from("exercises")
      .select("id, name")
      .eq("id", AIR_SQUAT_ID)
      .single();
    
    if (airSquats) {
      await addItem(supabase, circuitBlock.id, airSquats.id, order++, {
        reps: 20,
        notes: "Explosive tempo, full depth, cardio conditioning"
      });
    }

    const burpees = await findExercise(supabase, ["Burpees"]);
    if (burpees) {
      await addItem(supabase, circuitBlock.id, burpees.id, order++, {
        reps: 15,
        notes: "Full chest to deck"
      });
    }

    const lunges = await findExercise(supabase, ["Walking Lunges"]);
    if (lunges) {
      await addItem(supabase, circuitBlock.id, lunges.id, order++, {
        reps: 20,
        notes: "10 each leg, controlled"
      });
    }

    const burpeeBroadJump = await findExercise(supabase, ["Burpee Broad Jump"]);
    if (burpeeBroadJump) {
      await addItem(supabase, circuitBlock.id, burpeeBroadJump.id, order++, {
        reps: 10,
        notes: "Max distance, soft landing"
      });
    }

    const plank = await findExercise(supabase, ["Plank"]);
    if (plank) {
      await addItem(supabase, circuitBlock.id, plank.id, order++, {
        duration: "1min",
        notes: "Strong position, breathe steadily"
      });
    }
  }

  console.log("✅ Bodyweight Grinder created");
}

/**
 * 12. BODYWEIGHT POWER INTERVALS
 * 6 rounds: 40s Burpees/Lunges/Climbers/Squats + 20s rest
 */
async function buildBodyweightPower(
  supabase: SupabaseClient,
  planDayId: string,
  options: CardioSessionOptions,
  modifier: number
) {
  const sessionData = await createSession(
    supabase,
    planDayId,
    "Bodyweight Power Intervals",
    "No equipment needed. Push hard on the 40s, active recovery during rests. This simulates the heart rate spikes and recovery patterns of Hyrox transitions."
  );

  const rounds = Math.round(6 * modifier);

  const exercises = [
    { name: ["Burpees"], notes: "Max reps, full chest to deck" },
    { name: ["Walking Lunges"], notes: "Alternate legs, explosive tempo" },
    { name: ["Mountain Climbers"], notes: "Fast pace, knees to chest" },
    { name: ["Air Squat"], notes: "Max reps, full depth" },
  ];

  for (const ex of exercises) {
    const { data: intervalBlock } = await supabase
      .from("session_blocks")
      .insert({
        session_id: sessionData.id,
        block_type: "cardio",
        title: `${ex.name[0]} Intervals`,
        rounds: rounds,
        parameters: { 
          format: "intervals",
          work_sec: 40,
          rest_sec: 20,
          intensity: "hard"
        },
      })
      .select()
      .single();

    if (intervalBlock) {
      const exercise = await findExercise(supabase, ex.name);
      if (exercise) {
        await addItem(supabase, intervalBlock.id, exercise.id, 0, {
          duration: "40s",
          rest: "20s",
          notes: ex.notes
        });
      }
    }
  }

  // Add 90s rest between exercise blocks
  const { data: restBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionData.id,
      block_type: "cardio",
      title: "Rest Between Exercises",
      parameters: { format: "standard" },
    })
    .select()
    .single();

  if (restBlock) {
    const walk = await findExercise(supabase, ["Easy Walk", "Walk"]);
    if (walk) {
      await addItem(supabase, restBlock.id, walk.id, 0, {
        duration: "90s",
        notes: "Active recovery between exercises"
      });
    }
  }

  console.log("✅ Bodyweight Power Intervals created");
}

