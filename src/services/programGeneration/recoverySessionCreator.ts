/**
 * Recovery Session Creator
 * 
 * SIMPLE RULE: Every rest day gets an Active Recovery session with mobility exercises
 * NO EXCEPTIONS, NO FAILURES
 */

import type { SupabaseClient } from "@supabase/supabase-js";

const SHORT_RECOVERY_SESSION_TITLE = "Recovery / Mobility (Short)";
const SHORT_RECOVERY_ROUNDS = 4;

const SHORT_RECOVERY_EXERCISES: Array<{
  name: string;
  exerciseId: string;
  notes: string;
  durationSec?: number;
}> = [
  {
    name: "Inchworms",
    exerciseId: "c61ef2d5-014d-4e92-bd5e-201a2e8f0072",
    notes: "Walk hands out to a strong plank, heels stay heavy on the way back.",
    durationSec: 45,
  },
  {
    name: "Hip Flexor Stretch Right",
    exerciseId: "74f1bab3-ef99-48e0-95f5-4845d09e7e2f",
    notes: "Posterior pelvic tilt, squeeze glute, breathe deep into the front of the hip.",
    durationSec: 45,
  },
  {
    name: "Hamstring Stretch",
    exerciseId: "ff5cef72-08a8-4168-bb47-5ae49234c463",
    notes: "Long spine, hinge at the hips, relax shoulders and keep gentle tension.",
    durationSec: 45,
  },
  {
    name: "Foam Roller Mid Back",
    exerciseId: "4d01a06b-1ce3-48ee-a6cc-9735d4b92e5c",
    notes: "Slow rolls through mid/upper back. Support head, breathe into the floor.",
    durationSec: 45,
  },
  {
    name: "Standing Hip CARs",
    exerciseId: "3d755717-f706-4b08-8b8c-8586083e6371",
    notes: "Controlled articular rotations. Stay tall, limit torso sway, smooth circles.",
    durationSec: 45,
  },
];

/**
 * Create a recovery session for a rest day
 * Returns the session ID or throws an error
 */
export async function createRecoverySessionForRestDay(
  supabase: SupabaseClient,
  planDayId: string
): Promise<string> {
  console.log(`🧘 Creating ${SHORT_RECOVERY_SESSION_TITLE} session for plan_day: ${planDayId}`);
  
  // 1. Create session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name: SHORT_RECOVERY_SESSION_TITLE,
      notes: `Mobility Flow Circuit: 45s work • 15s rest • ${SHORT_RECOVERY_ROUNDS} rounds. Focus on controlled movement and deep breathing.`,
      order_index: 1,
    })
    .select()
    .single();
  
  if (sessionError || !session) {
    throw new Error(`Failed to create recovery session: ${sessionError?.message}`);
  }
  
  console.log(`✅ Recovery session created: ${session.id}`);
  
  // 2. Create mobility block (circuit format with timer)
  const { data: mobilityBlock, error: blockError } = await supabase
    .from("session_blocks")
    .insert({
      session_id: session.id,
      block_type: "circuit",
      title: "Mobility Flow Circuit",
      parameters: {
        format: "circuit",
        focus: "recovery",
        rounds: SHORT_RECOVERY_ROUNDS,
        work_sec: 45,
        rest_sec: 15,
        notes: `45s work • 15s rest • ${SHORT_RECOVERY_ROUNDS} rounds. Focus on controlled movement and deep breathing.`,
      },
      rounds: SHORT_RECOVERY_ROUNDS,
      work_sec: 45, // 45 seconds per exercise
      rest_sec: 15, // 15 seconds rest between exercises
      rest_between_rounds_s: 30, // brief reset between laps
      order_index: 1,
    })
    .select()
    .single();
  
  if (blockError || !mobilityBlock) {
    throw new Error(`Failed to create mobility block: ${blockError?.message}`);
  }
  
  // 3. Add mobility exercises (HARDCODED - no database lookups that can fail)
  let order = 0;
  for (const exercise of SHORT_RECOVERY_EXERCISES) {
    if (!exercise.exerciseId) {
      console.warn(`⚠️ Missing exercise ID for ${exercise.name}, skipping`);
      continue;
    }

    const durationSec = exercise.durationSec ?? 45;
    const durationMin = durationSec / 60; // Convert to minutes for extra field

    const { error: itemError } = await supabase
      .from("session_block_items")
      .insert({
        block_id: mobilityBlock.id,
        exercise_id: exercise.exerciseId,
        item_order: order++,
        duration_sec: durationSec,
        sets: 1,
        reps: 0,
        status: "draft",
        notes: exercise.notes,
        extra: {
          duration: durationMin, // Store in minutes for admin panel display
        },
      });
    
    if (itemError) {
      console.error(`❌ Failed to add ${exercise.name}:`, itemError);
      // Continue anyway - don't fail the whole session
    }
  }
  
  console.log(`✅ Added ${order} mobility exercises to recovery circuit (45s work / 15s rest / 2 rounds)`);
  
  return session.id;
}

/**
 * Create recovery sessions for ALL rest days in a week
 * @param supabase - Supabase client
 * @param planDays - All plan days (14 days)
 * @param sessionDays - Set of day names that have workouts (e.g., "Monday", "Wednesday")
 * @returns Array of created session IDs
 */
export async function createRecoverySessionsForRestDays(
  supabase: SupabaseClient,
  planDays: Array<{ id: string; dayName: string; day_index: number }>,
  sessionDays: Set<string>
): Promise<{ sessionIds: string[]; errors: string[] }> {
  const sessionIds: string[] = [];
  const errors: string[] = [];
  
  // Only create recovery sessions for Week 1 (days 1-7)
  // Week 2 will be duplicated with progression
  const week1Days = planDays.slice(0, 7);
  
  for (const planDay of week1Days) {
    if (!sessionDays.has(planDay.dayName)) {
      console.log(`🛌 Day ${planDay.day_index} (${planDay.dayName}) is a rest day - creating recovery session`);
      
      // Mark as rest day
      await supabase
        .from("plan_days")
        .update({ 
          is_rest: true,
          description: SHORT_RECOVERY_SESSION_TITLE
        })
        .eq("id", planDay.id);
      
      // Create recovery session
      try {
        const sessionId = await createRecoverySessionForRestDay(supabase, planDay.id);
        sessionIds.push(sessionId);
        console.log(`   ✅ Recovery session created: ${sessionId} for Day ${planDay.day_index}`);
      } catch (error: any) {
        const errorMsg = `Failed to create recovery session for Day ${planDay.day_index}: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        errors.push(errorMsg);
        // Continue anyway - don't fail the whole program
      }
    }
  }
  
  console.log(`✅ Created ${sessionIds.length} recovery sessions for rest days`);
  
  return { sessionIds, errors };
}

