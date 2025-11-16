/**
 * Hyrox Race Simulations Generator
 * 
 * Creates OPTIONAL race simulation workouts that users can access anytime.
 * These are NOT tied to specific days - just available as extra workouts.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Generate optional Hyrox race simulations (Hyrox Full & Hyrox Half)
 * These are standalone workouts users can do anytime - NOT a 14-day schedule
 */
export async function generateHyroxTrack(
  supabase: SupabaseClient,
  planId: string
): Promise<{ dayIds: string[]; errors: string[] }> {
  const dayIds: string[] = [];
  const errors: string[] = [];

  console.log(`🏃 Creating Hyrox race simulations for plan ${planId}`);

  // Just create 2 simulation workouts (not a full schedule)
  const simulations = [
    { dayIndex: 101, title: "Hyrox Full Simulation", variant: "full" },
    { dayIndex: 102, title: "Hyrox Full Simulation", variant: "full" }, // Second instance for retries
  ];

  for (const sim of simulations) {
    const { data: planDay, error: dayError } = await supabase
      .from("plan_days")
      .insert({
        plan_id: planId,
        day_index: sim.dayIndex,
        dayName: null, // Not tied to a specific day
        is_rest: false,
        description: sim.title,
        track_name: "hyrox",
        is_optional: true,
      })
      .select()
      .single();

    if (dayError || !planDay) {
      console.error(`❌ Failed to create ${sim.title}:`, dayError);
      errors.push(`Failed to create ${sim.title}: ${dayError?.message}`);
      continue;
    }

    dayIds.push(planDay.id);
    console.log(`✅ Created ${sim.title} (day_index ${sim.dayIndex})`);

    // Generate the simulation workout
    try {
      await generateHyroxSimulation(supabase, planDay.id);
    } catch (error: any) {
      console.error(`❌ Error generating ${sim.title}:`, error);
      errors.push(`Error generating ${sim.title}: ${error.message}`);
    }
  }

  console.log(`✅ Created ${dayIds.length} Hyrox simulations`);
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
