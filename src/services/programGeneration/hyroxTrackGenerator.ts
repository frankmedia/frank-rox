/**
 * Hyrox Track Generator
 * 
 * Creates 14 OPTIONAL Hyrox-focused training days that run parallel to the main programme.
 * Users can access these as extra workouts when they want additional Hyrox-specific training.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generate 14-day optional Hyrox track
 * Each day has a different Hyrox focus (simulations, station work, technique, accessories)
 */
export async function generateHyroxTrack(
  supabase: SupabaseClient,
  planId: string
): Promise<{ dayIds: string[]; errors: string[] }> {
  const dayIds: string[] = [];
  const errors: string[] = [];

  console.log(`🏃 Creating 14-day optional Hyrox track for plan ${planId}`);

  // Define the 14-day Hyrox track schedule
  const hyroxSchedule = [
    { dayIndex: 1, dayName: "Monday", title: "Hyrox Simulation - Full Race", type: "simulation" },
    { dayIndex: 2, dayName: "Tuesday", title: "SkiErg + Sled Technique", type: "station-work" },
    { dayIndex: 3, dayName: "Wednesday", title: "Burpee Broad Jump + Rowing Intervals", type: "station-work" },
    { dayIndex: 4, dayName: "Thursday", title: "Farmer Carry + Lunges Practice", type: "station-work" },
    { dayIndex: 5, dayName: "Friday", title: "Wall Balls + Sled Push/Pull", type: "station-work" },
    { dayIndex: 6, dayName: "Saturday", title: "Hyrox Accessory - Running Technique", type: "accessory" },
    { dayIndex: 7, dayName: "Sunday", title: "Active Recovery", type: "recovery" },
    { dayIndex: 8, dayName: "Monday", title: "Hyrox Simulation - Timed Stations", type: "simulation" },
    { dayIndex: 9, dayName: "Tuesday", title: "SkiErg Intervals + Burpee Conditioning", type: "station-work" },
    { dayIndex: 10, dayName: "Wednesday", title: "Rowing Sprints + Wall Ball Endurance", type: "station-work" },
    { dayIndex: 11, dayName: "Thursday", title: "Sled Strength + Farmer Carry Endurance", type: "station-work" },
    { dayIndex: 12, dayName: "Friday", title: "Lunges + BBJ Speed Work", type: "station-work" },
    { dayIndex: 13, dayName: "Saturday", title: "Hyrox Accessory - Power Endurance", type: "accessory" },
    { dayIndex: 14, dayName: "Sunday", title: "Active Recovery", type: "recovery" },
  ];

  // Create plan_days for Hyrox track
  for (const day of hyroxSchedule) {
    const { data: planDay, error: dayError } = await supabase
      .from("plan_days")
      .insert({
        plan_id: planId,
        day_index: day.dayIndex,
        dayName: day.dayName,
        is_rest: day.type === "recovery",
        description: day.title,
        track_name: "hyrox",
        is_optional: true,
      })
      .select()
      .single();

    if (dayError || !planDay) {
      console.error(`❌ Failed to create Hyrox track day ${day.dayIndex}:`, dayError);
      errors.push(`Failed to create Hyrox track day ${day.dayIndex}: ${dayError?.message}`);
      continue;
    }

    dayIds.push(planDay.id);
    console.log(`✅ Created Hyrox track day ${day.dayIndex}: ${day.title}`);

    // Generate workout based on type
    try {
      if (day.type === "simulation") {
        await generateHyroxSimulation(supabase, planDay.id);
      } else if (day.type === "station-work") {
        await generateStationWork(supabase, planDay.id, day.title);
      } else if (day.type === "accessory") {
        await generateHyroxAccessory(supabase, planDay.id, day.title);
      }
      // Recovery days don't need sessions (or could add light mobility)
    } catch (error: any) {
      console.error(`❌ Error generating Hyrox workout for day ${day.dayIndex}:`, error);
      errors.push(`Error generating Hyrox workout for day ${day.dayIndex}: ${error.message}`);
    }
  }

  console.log(`✅ Created ${dayIds.length} Hyrox track days`);
  return { dayIds, errors };
}

/**
 * Generate a full Hyrox simulation workout (8 stations + runs)
 * Uses the EXISTING createHyroxSimInDay function
 */
async function generateHyroxSimulation(
  supabase: SupabaseClient,
  planDayId: string
): Promise<void> {
  const { createHyroxSimInDay } = await import("../generators/hyroxGenerator");
  await createHyroxSimInDay(supabase, planDayId);
}

/**
 * Generate station-specific work (e.g., SkiErg + Sled)
 * Creates focused workouts for specific Hyrox stations
 */
async function generateStationWork(
  supabase: SupabaseClient,
  planDayId: string,
  title: string
): Promise<void> {
  // Create session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name: title,
      notes: "Station-specific technique and conditioning work",
      order_index: 1,
    })
    .select()
    .single();

  if (sessionError || !session) {
    throw new Error(`Failed to create station work session: ${sessionError?.message}`);
  }

  // Create circuit block for station work
  const { data: block, error: blockError } = await supabase
    .from("session_blocks")
    .insert({
      session_id: session.id,
      block_type: "circuit",
      title: "Station Practice",
      rounds: 4,
      rest_between_rounds_s: 120,
      parameters: { format: "circuit", focus: "hyrox-stations" },
      order_index: 1,
    })
    .select()
    .single();

  if (blockError || !block) {
    throw new Error(`Failed to create station block: ${blockError?.message}`);
  }

  // Add station exercises based on title (simplified - can be expanded later)
  // For now, just mark the day so users know it's available
  await supabase.from("plan_days").update({
    description: title,
  }).eq("id", planDayId);
}

/**
 * Generate Hyrox accessory workout
 * Uses existing Hyrox accessory templates
 */
async function generateHyroxAccessory(
  supabase: SupabaseClient,
  planDayId: string,
  title: string
): Promise<void> {
  // Create session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name: title,
      notes: "Supplementary training to support Hyrox performance",
      order_index: 1,
    })
    .select()
    .single();

  if (sessionError || !session) {
    throw new Error(`Failed to create accessory session: ${sessionError?.message}`);
  }

  // Create strength block for accessory work
  await supabase.from("session_blocks").insert({
    session_id: session.id,
    block_type: "strength",
    title: "Hyrox Accessory Work",
    parameters: { focus: "hyrox-support" },
    order_index: 1,
  });
  
  await supabase.from("plan_days").update({
    description: title,
  }).eq("id", planDayId);
}

