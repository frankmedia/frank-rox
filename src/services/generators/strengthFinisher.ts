/**
 * Strength Workout Finishers
 * 
 * 4-minute high-intensity finishers to add at the end of strength workouts.
 * Three rotating options to keep variety.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// Helper function to create a session
async function createSession(
  supabase: SupabaseClient,
  planDayId: string,
  name: string,
  description?: string
) {
  const { data, error } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name,
      notes: description || null,
      order_index: 10, // High order to place at end
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create session: ${error.message}`);
  return data;
}

// Helper function to find exercise by name
async function findExercise(
  supabase: SupabaseClient,
  names: string[]
): Promise<any> {
  for (const name of names) {
    const { data } = await supabase
      .from("exercises")
      .select("id, name")
      .ilike("name", `%${name}%`)
      .limit(1);
    
    if (data && data.length > 0) {
      console.log(`✅ Found exercise for finisher: ${data[0].name}`);
      return data[0];
    }
  }
  console.warn(`⚠️ Finisher exercise NOT FOUND. Searched for: ${names.join(", ")}`);
  return null;
}

// Helper to add item to block
async function addItem(
  supabase: SupabaseClient,
  blockId: string,
  exerciseId: string,
  order: number,
  params: any = {}
) {
  const payload: Record<string, any> = {
    block_id: blockId,
    exercise_id: exerciseId,
    item_order: order,
    status: "draft",
  };

  // Add optional fields
  if (params.sets) payload.sets = params.sets;
  if (params.reps) payload.reps = params.reps;
  if (params.weight) payload.weight_kg = params.weight;
  if (params.notes) payload.notes = params.notes;

  // Handle distance - convert to meters
  if (params.distance) {
    if (typeof params.distance === 'string') {
      const distStr = String(params.distance);
      const distMatch = distStr.match(/(\d+(?:\.\d+)?)\s*(m|km)/i);
      if (distMatch) {
        const value = parseFloat(distMatch[1]);
        const unit = distMatch[2].toLowerCase();
        payload.distance_m = Math.round(unit === 'km' ? value * 1000 : value);
      }
    } else {
      // Assume it's in km (decimal like 0.1 for 100m)
      payload.distance_m = Math.round(params.distance * 1000);
    }
  }

  // Handle duration - convert to seconds
  if (params.duration) {
    if (typeof params.duration === 'string') {
      const durStr = String(params.duration);
      const durMatch = durStr.match(/(\d+(?:\.\d+)?)\s*min/i);
      if (durMatch) {
        payload.duration_sec = Math.round(parseFloat(durMatch[1]) * 60);
      } else {
        // Try seconds
        const secMatch = durStr.match(/(\d+(?:\.\d+)?)\s*s/i);
        if (secMatch) {
          payload.duration_sec = Math.round(parseFloat(secMatch[1]));
        }
      }
    } else {
      // Assume it's in minutes (decimal like 0.5 for 30 seconds)
      payload.duration_sec = Math.round(params.duration * 60);
    }
  }

  // Handle rest - convert to seconds
  if (params.rest) {
    if (typeof params.rest === 'string') {
      const restMatch = params.rest.match(/(\d+)\s*(s|sec|min)/i);
      if (restMatch) {
        const value = parseInt(restMatch[1]);
        const unit = restMatch[2].toLowerCase();
        payload.rest_sec = unit.startsWith('min') ? value * 60 : value;
      }
    } else {
      // Assume it's in seconds
      payload.rest_sec = params.rest;
    }
  }

  // Store all params in extra as well for compatibility
  if (Object.keys(params).length) {
    payload.extra = params;
  }

  const { error } = await supabase.from("session_block_items").insert(payload);

  if (error) {
    console.error(`❌ Failed to add item to block ${blockId}:`, error);
    throw error;
  }
}

async function getNextBlockOrderIndex(supabase: SupabaseClient, sessionId: string): Promise<number> {
  const { data } = await supabase
    .from("session_blocks")
    .select("order_index")
    .eq("session_id", sessionId)
    .order("order_index", { ascending: false })
    .limit(1);
  const maxOrder = data?.[0]?.order_index ?? 0;
  return (typeof maxOrder === "number" ? maxOrder : 0) + 1;
}

/**
 * FINISHER OPTION 1: 4 Min AMRAP
 * - 10 burpee box jumps
 * - 100m ski
 */
async function buildFinisher1_BurpeeBoxSkiAMRAP(
  supabase: SupabaseClient,
  sessionId: string
) {
  console.log("🔥 Adding Finisher 1: 4min AMRAP (Burpee Box Jumps + Ski)");

  const orderIndex = await getNextBlockOrderIndex(supabase, sessionId);
  const { data: amrapBlock, error: amrapBlockError } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionId,
      block_type: "amrap",
      title: "AMRAP Finisher",
      parameters: { 
        format: "amrap",
        intensity: "hard",
        time_cap: 4, // UI looks for this
        block_duration_sec: 240,
      },
      rounds: 1,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (amrapBlockError || !amrapBlock) {
    console.error("❌ Failed to create Finisher 1 block:", amrapBlockError);
    throw amrapBlockError || new Error("Failed to create Finisher 1 block");
  }

  if (amrapBlock) {
    let order = 0;

    // Burpee Box Jumps
    const burpeeBoxExercise = await findExercise(supabase, [
      "Burpee Box Jump",
      "Burpee Box Jumps",
      "Box Jump Burpee",
      "Burpee Broad Jump",
      "Burpees",
    ]);
    if (burpeeBoxExercise) {
      await addItem(supabase, amrapBlock.id, burpeeBoxExercise.id, order++, {
        reps: 10,
        notes: "Step down from box - don't jump down",
      });
    }

    // SkiErg 100m
    const SKIERG_ID = "917c05c6-5adf-4d3b-887e-ff2a292fa079";
    await addItem(supabase, amrapBlock.id, SKIERG_ID, order++, {
      distance: "100m", // Will be converted to distance_m = 100
      notes: "Fast and aggressive - full send",
    });

    console.log("✅ Finisher 1 created");
  }
}

/**
 * FINISHER OPTION 2: Max Effort in 1 Minute
 * Alternates between:
 * - Max Cals on any erg (SkiErg/RowErg/Assault Bike)
 * - Max burpees in 1 min
 */
async function buildFinisher2_MaxEffort1Min(
  supabase: SupabaseClient,
  sessionId: string,
  variant: "erg" | "burpees"
) {
  console.log(`🔥 Adding Finisher 2: Max Effort 1 Min (${variant})`);

  const orderIndex = await getNextBlockOrderIndex(supabase, sessionId);
  const { data: maxBlock, error: maxBlockError } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionId,
      block_type: "amrap",
      title: variant === "erg" ? "Max Cals - 1 Min" : "Max Burpees - 1 Min",
      parameters: { 
        format: "amrap",
        intensity: "max",
        time_cap: 1, // 1 minute per round
        block_duration_sec: 60,
      },
      rounds: 4, // 4 rounds with 1min rest
      rest_between_rounds_s: 60, // 1 minute rest
      order_index: orderIndex,
    })
    .select()
    .single();

  if (maxBlockError || !maxBlock) {
    console.error(`❌ Failed to create Finisher 2 (${variant}) block:`, maxBlockError);
    throw maxBlockError || new Error("Failed to create Finisher 2 block");
  }

  if (maxBlock) {
    if (variant === "erg") {
      // Rotate between SkiErg, RowErg, Assault Bike
      const SKIERG_ID = "917c05c6-5adf-4d3b-887e-ff2a292fa079";
      const ROWERG_ID = "d8f8bf07-c315-40a4-ae0c-b3fcb4db74e2";
      const assaultBike = await findExercise(supabase, ["Assault Bike", "Air Bike"]);
      
      const ergIds = [SKIERG_ID, ROWERG_ID];
      if (assaultBike) ergIds.push(assaultBike.id);
      
      // Pick one randomly
      const chosenErgId = ergIds[Math.floor(Math.random() * ergIds.length)];
      
      await addItem(supabase, maxBlock.id, chosenErgId, 0, {
        duration: "1min", // 1 minute
        notes: "Max effort - ALL OUT for 1 minute. Record your calories!",
      });
    } else {
      // Burpees
      const burpeeExercise = await findExercise(supabase, ["Burpee", "Burpees"]);
      if (burpeeExercise) {
        await addItem(supabase, maxBlock.id, burpeeExercise.id, 0, {
          duration: "1min", // 1 minute
          notes: "Max reps in 1 minute - chest to floor, full jump. Record your score!",
        });
      }
    }

    console.log(`✅ Finisher 2 (${variant}) created`);
  }
}

/**
 * FINISHER OPTION 3: Circuit Finisher
 * 3 rounds of:
 * - 45sec burpees (15s rest)
 * - 45sec star jumps (15s rest)
 * - 45sec lunge jumps (15s rest)
 * - 45sec press ups (15s rest)
 */
async function buildFinisher3_4MinCircuit(
  supabase: SupabaseClient,
  sessionId: string
) {
  console.log("🔥 Adding Finisher 3: Circuit Finisher (3 rounds × 4 exercises, 45s work / 15s rest)");

  const orderIndex = await getNextBlockOrderIndex(supabase, sessionId);
  const { data: circuitBlock, error: circuitBlockError } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionId,
      block_type: "circuit",
      title: "Circuit Finisher",
      parameters: { 
        format: "circuit",
        intensity: "hard"
      },
      rounds: 3, // 3 rounds
      rest_between_rounds_s: 0, // No rest between rounds
      work_sec: 45, // 45 seconds work per exercise
      rest_sec: 15, // 15 seconds rest between exercises
      order_index: orderIndex,
    })
    .select()
    .single();

  if (circuitBlockError || !circuitBlock) {
    console.error("❌ Failed to create Finisher 3 block:", circuitBlockError);
    throw circuitBlockError || new Error("Failed to create Finisher 3 block");
  }

  if (circuitBlock) {
    let order = 0;

    // 1. Burpees
    const burpeeExercise = await findExercise(supabase, ["Burpee", "Burpees"]);
    if (burpeeExercise) {
      await addItem(supabase, circuitBlock.id, burpeeExercise.id, order++, {
        notes: "Max effort",
      });
    }

    // 2. Star Jumps
    const starJumpExercise = await findExercise(supabase, [
      "Star Jump",
      "Jumping Jack",
      "Star Jumps",
    ]);
    if (starJumpExercise) {
      await addItem(supabase, circuitBlock.id, starJumpExercise.id, order++, {
        notes: "Explosive",
      });
    }

    // 3. Lunge Jumps
    const lungeJumpExercise = await findExercise(supabase, [
      "Lunge Jump",
      "Jumping Lunge",
      "Alternating Lunge Jump",
    ]);
    if (lungeJumpExercise) {
      await addItem(supabase, circuitBlock.id, lungeJumpExercise.id, order++, {
        notes: "Alternating legs",
      });
    }

    // 4. Press Ups
    const pressUpExercise = await findExercise(supabase, [
      "Press Up",
      "Push Up",
      "Push-Up",
      "Pushup",
    ]);
    if (pressUpExercise) {
      await addItem(supabase, circuitBlock.id, pressUpExercise.id, order++, {
        notes: "Chest to floor",
      });
    }

    console.log("✅ Finisher 3 created");
  }
}

/**
 * Main function to add a finisher to an existing session
 * Rotates through 3 finisher options
 */
export async function addStrengthFinisher(
  supabase: SupabaseClient,
  sessionId: string,
  finisherNumber: number // 1, 2, or 3
): Promise<void> {
  console.log(`🔥 Adding strength finisher #${finisherNumber} to session ${sessionId}`);

  switch (finisherNumber) {
    case 1:
      await buildFinisher1_BurpeeBoxSkiAMRAP(supabase, sessionId);
      break;
    case 2:
      // Alternate between erg and burpees based on random
      const variant = Math.random() > 0.5 ? "erg" : "burpees";
      await buildFinisher2_MaxEffort1Min(supabase, sessionId, variant);
      break;
    case 3:
      await buildFinisher3_4MinCircuit(supabase, sessionId);
      break;
    default:
      console.warn(`⚠️ Invalid finisher number: ${finisherNumber}. Using finisher 1.`);
      await buildFinisher1_BurpeeBoxSkiAMRAP(supabase, sessionId);
  }
}

/**
 * Helper to determine which finisher to use based on week/day
 * Returns 1, 2, or 3
 */
export function getFinisherRotation(dayIndex: number): number {
  // Rotate through finishers: Day 1→1, Day 2→2, Day 3→3, Day 4→1, etc.
  return ((dayIndex - 1) % 3) + 1;
}

