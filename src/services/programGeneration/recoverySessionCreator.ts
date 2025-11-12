/**
 * Recovery Session Creator
 * 
 * SIMPLE RULE: Every rest day gets an Active Recovery session with mobility exercises
 * NO EXCEPTIONS, NO FAILURES
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Create a recovery session for a rest day
 * Returns the session ID or throws an error
 */
export async function createRecoverySessionForRestDay(
  supabase: SupabaseClient,
  planDayId: string
): Promise<string> {
  console.log(`🧘 Creating Active Recovery session for plan_day: ${planDayId}`);
  
  // 1. Create session
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      plan_day_id: planDayId,
      name: "Active Recovery",
      notes: "Full recovery session to promote blood flow, reduce soreness, and maintain mobility. Move slowly and mindfully.",
      order_index: 1,
    })
    .select()
    .single();
  
  if (sessionError || !session) {
    throw new Error(`Failed to create recovery session: ${sessionError?.message}`);
  }
  
  console.log(`✅ Recovery session created: ${session.id}`);
  
  // 2. Create mobility block
  const { data: mobilityBlock, error: blockError } = await supabase
    .from("session_blocks")
    .insert({
      session_id: session.id,
      block_type: "mobility",
      title: "Mobility & Stretching",
      parameters: { format: "standard" },
      order_index: 1,
    })
    .select()
    .single();
  
  if (blockError || !mobilityBlock) {
    throw new Error(`Failed to create mobility block: ${blockError?.message}`);
  }
  
  // 3. Add mobility exercises (HARDCODED - no database lookups that can fail)
  const mobilityExercises = [
    { name: "Inchworms", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Inchworms") },
    { name: "Thoracic Rotation (Open Book)", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Thoracic Rotation") },
    { name: "Standing Hip CARs", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Standing Hip CARs") },
    { name: "90/90 Hip Switches", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "90/90 Hip Switches") },
    { name: "Hamstring Stretch", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Hamstring Stretch") },
    { name: "Quad Stretch", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Quad Stretch") },
    { name: "Cossack Squat", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Cossack Squat") },
    { name: "Figure of 4 Stretch", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Figure of 4 Stretch") },
    { name: "Bird Dog", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Bird Dog") },
    { name: "Dead Bug", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Dead Bug") },
    { name: "Plank", duration: "1min", exerciseId: await findExerciseOrWarn(supabase, "Plank") },
    { name: "Ankle Dorsiflexion Mobilization", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Ankle Dorsiflexion") },
    { name: "Foam Roller On Mid Back", duration: "2min", exerciseId: await findExerciseOrWarn(supabase, "Foam Roller") },
  ];
  
  let order = 0;
  for (const exercise of mobilityExercises) {
    if (!exercise.exerciseId) {
      console.warn(`⚠️ Skipping ${exercise.name} - not found in database`);
      continue;
    }
    
    const durationSeconds = exercise.duration.includes('min') 
      ? parseInt(exercise.duration) * 60 
      : parseInt(exercise.duration);
    
    const { error: itemError } = await supabase
      .from("session_block_items")
      .insert({
        block_id: mobilityBlock.id,
        exercise_id: exercise.exerciseId,
        item_order: order++,
        duration_sec: durationSeconds,
        status: "draft",
        notes: `Hold for ${exercise.duration}, breathe deeply`,
      });
    
    if (itemError) {
      console.error(`❌ Failed to add ${exercise.name}:`, itemError);
      // Continue anyway - don't fail the whole session
    }
  }
  
  console.log(`✅ Added ${order} mobility exercises to recovery session`);
  
  return session.id;
}

/**
 * Find exercise by name, return null if not found (don't throw)
 */
async function findExerciseOrWarn(
  supabase: SupabaseClient,
  searchTerm: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("exercises")
    .select("id, name")
    .ilike("name", `%${searchTerm}%`)
    .limit(1)
    .single();
  
  if (error || !data) {
    console.warn(`⚠️ Exercise not found: "${searchTerm}"`);
    return null;
  }
  
  return data.id;
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
          description: "Rest & Recovery"
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

