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

  // Create Hyrox Full and Half simulations
  const simulations = [
    { dayIndex: 101, title: "Hyrox Full Simulation", variant: "full" as const },
    { dayIndex: 102, title: "Hyrox Half Simulation", variant: "half" as const },
  ];

  for (const sim of simulations) {
    const { data: planDay, error: dayError } = await supabase
      .from("plan_days")
      .insert({
        plan_id: planId,
        day_index: sim.dayIndex,
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
      await generateHyroxSimulation(supabase, planDay.id, sim.variant);
    } catch (error: any) {
      console.error(`❌ Error generating ${sim.title}:`, error);
      errors.push(`Error generating ${sim.title}: ${error.message}`);
    }
  }

  console.log(`✅ Created ${dayIds.length} Hyrox simulations`);
  return { dayIds, errors };
}

/**
 * Generate a Hyrox simulation workout (Full or Half)
 * Uses the EXISTING createHyroxSimInDay function
 */
async function generateHyroxSimulation(
  supabase: SupabaseClient,
  planDayId: string,
  variant: "full" | "half"
): Promise<void> {
  const { createHyroxSimInDay } = await import("../generators/hyroxGenerator");
  await createHyroxSimInDay(supabase, planDayId, variant);
}
