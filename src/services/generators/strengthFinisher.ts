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
  const { error } = await supabase.from("session_block_items").insert({
    block_id: blockId,
    exercise_id: exerciseId,
    item_order: order,
    sets: params.sets || null,
    reps: params.reps || null,
    duration_sec: params.duration ? params.duration * 60 : null,
    distance_km: params.distance || null,
    weight_kg: params.weight || null,
    notes: params.notes || null,
  });

  if (error) {
    console.error(`❌ Failed to add item to block ${blockId}:`, error);
  }
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

  const { data: amrapBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionId,
      block_type: "amrap",
      title: "4 Min AMRAP",
      parameters: { 
        format: "amrap",
        intensity: "hard",
        duration: 4
      },
      rounds: 1,
      duration_sec: 240, // 4 minutes
    })
    .select()
    .single();

  if (amrapBlock) {
    let order = 0;

    // Burpee Box Jumps
    const burpeeBoxExercise = await findExercise(supabase, [
      "Burpee Box Jump",
      "Box Jump Burpee",
      "Burpee Box",
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
      distance: 0.1, // 100m = 0.1km
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

  const { data: maxBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionId,
      block_type: "amrap",
      title: variant === "erg" ? "Max Cals in 1 Min" : "Max Burpees in 1 Min",
      parameters: { 
        format: "amrap",
        intensity: "max",
        duration: 1
      },
      rounds: 4, // 4 rounds with 1min rest
      duration_sec: 60, // 1 minute work
      rest_between_rounds_s: 60, // 1 minute rest
    })
    .select()
    .single();

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
        notes: "Max effort - ALL OUT for 1 minute. Record your calories!",
      });
    } else {
      // Burpees
      const burpeeExercise = await findExercise(supabase, ["Burpee", "Burpees"]);
      if (burpeeExercise) {
        await addItem(supabase, maxBlock.id, burpeeExercise.id, 0, {
          notes: "Max reps in 1 minute - chest to floor, full jump. Record your score!",
        });
      }
    }

    console.log(`✅ Finisher 2 (${variant}) created`);
  }
}

/**
 * FINISHER OPTION 3: 4 Min Circuit
 * 2 rounds of:
 * - 30sec burpees
 * - 30sec star jumps
 * - 30sec lunge jumps
 * - 30sec press ups
 */
async function buildFinisher3_4MinCircuit(
  supabase: SupabaseClient,
  sessionId: string
) {
  console.log("🔥 Adding Finisher 3: 4min Circuit (2 rounds × 4 exercises)");

  const { data: circuitBlock } = await supabase
    .from("session_blocks")
    .insert({
      session_id: sessionId,
      block_type: "circuit",
      title: "4 Min Circuit",
      parameters: { 
        format: "circuit",
        intensity: "hard",
        duration: 4
      },
      rounds: 2, // 2 rounds
      rest_between_rounds_s: 0, // No rest between rounds
    })
    .select()
    .single();

  if (circuitBlock) {
    let order = 0;

    // 1. Burpees - 30sec
    const burpeeExercise = await findExercise(supabase, ["Burpee", "Burpees"]);
    if (burpeeExercise) {
      await addItem(supabase, circuitBlock.id, burpeeExercise.id, order++, {
        duration: 0.5, // 30 seconds
        notes: "30 seconds max effort",
      });
    }

    // 2. Star Jumps - 30sec
    const starJumpExercise = await findExercise(supabase, [
      "Star Jump",
      "Jumping Jack",
      "Star Jumps",
    ]);
    if (starJumpExercise) {
      await addItem(supabase, circuitBlock.id, starJumpExercise.id, order++, {
        duration: 0.5, // 30 seconds
        notes: "30 seconds explosive",
      });
    }

    // 3. Lunge Jumps - 30sec
    const lungeJumpExercise = await findExercise(supabase, [
      "Lunge Jump",
      "Jumping Lunge",
      "Alternating Lunge Jump",
    ]);
    if (lungeJumpExercise) {
      await addItem(supabase, circuitBlock.id, lungeJumpExercise.id, order++, {
        duration: 0.5, // 30 seconds
        notes: "30 seconds alternating legs",
      });
    }

    // 4. Press Ups - 30sec
    const pressUpExercise = await findExercise(supabase, [
      "Press Up",
      "Push Up",
      "Push-Up",
      "Pushup",
    ]);
    if (pressUpExercise) {
      await addItem(supabase, circuitBlock.id, pressUpExercise.id, order++, {
        duration: 0.5, // 30 seconds
        notes: "30 seconds chest to floor",
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

