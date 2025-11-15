/**
 * Standalone Program Generation Test Script
 * 
 * Run this to test program generation without the UI
 * Usage: npx tsx src/services/programGeneration/__tests__/testProgramGeneration.ts
 */

import { createClient } from '@supabase/supabase-js';
import { createPlanInDatabase } from '../../programmeToDatabase';

// Supabase connection
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Test client ID (replace with your actual test client ID)
const TEST_CLIENT_ID = 'your-test-client-id';

// Test programme configuration
const testProgramme = {
  sessions: [
    // Monday - Lower Body Strength
    {
      day: 'Monday',
      type: 'strength' as const,
      title: 'Lower Body Strength',
      effort: 'hard' as const,
      detail: 'Squat-focused session'
    },
    // Tuesday - REST (should get recovery session)
    // Wednesday - Upper Body Strength
    {
      day: 'Wednesday',
      type: 'strength' as const,
      title: 'Upper Body Strength',
      effort: 'hard' as const,
      detail: 'Push/Pull session'
    },
    // Thursday - REST (should get recovery session)
    // Friday - Cardio
    {
      day: 'Friday',
      type: 'cardio' as const,
      title: 'Cardio Conditioning',
      effort: 'moderate' as const,
      detail: 'hybrid-pyramid'
    },
    // Saturday - Long Run
    {
      day: 'Saturday',
      type: 'run' as const,
      title: 'Long Run',
      distance: '5km',
      pace: 'Zone 2',
      effort: 'easy' as const,
      detail: 'Build aerobic base'
    },
    // Sunday - Mobility
    {
      day: 'Sunday',
      type: 'recovery' as const,
      title: 'Active Recovery',
      effort: 'easy' as const,
      detail: 'Mobility and stretching'
    }
  ],
  preferences: {
    trainingDaysPerWeek: 5,
    runSessionsPerWeek: 1,
    cardioSessionsPerWeek: 1,
    focusAreas: ['Running', 'Strength', 'Cardio'],
    equipment: ['SkiErg', 'RowErg', 'Assault Bike', 'Wall balls', 'Heavy dumbbells']
  },
  generatedAt: new Date().toISOString(),
  blockNumber: 1,
  focus: 'base' as const
};

async function runTest() {
  console.log('🧪 ========================================');
  console.log('🧪 PROGRAM GENERATION TEST SCRIPT');
  console.log('🧪 ========================================\n');

  console.log('📋 Test Configuration:');
  console.log(`   Client ID: ${TEST_CLIENT_ID}`);
  console.log(`   Block: ${testProgramme.blockNumber} (${testProgramme.focus})`);
  console.log(`   Sessions: ${testProgramme.sessions.length}`);
  console.log(`   Training Days: ${testProgramme.preferences.trainingDaysPerWeek}`);
  console.log('');

  console.log('📅 Planned Sessions:');
  testProgramme.sessions.forEach((s, i) => {
    console.log(`   ${i + 1}. ${s.day}: ${s.title} (${s.type})`);
  });
  console.log('');

  // Step 1: Delete existing plan
  console.log('🗑️  Step 1: Deleting existing plans...');
  try {
    const { data: existingPlans } = await supabase
      .from('plans')
      .select('id')
      .eq('client_id', TEST_CLIENT_ID)
      .eq('status', 'active');

    if (existingPlans && existingPlans.length > 0) {
      console.log(`   Found ${existingPlans.length} existing plan(s)`);
      for (const plan of existingPlans) {
        await supabase.from('plans').delete().eq('id', plan.id);
      }
      console.log('   ✅ Deleted existing plans');
    } else {
      console.log('   No existing plans found');
    }
  } catch (error: any) {
    console.error('   ❌ Error deleting plans:', error.message);
  }
  console.log('');

  // Step 2: Generate new plan
  console.log('🏗️  Step 2: Generating new plan...');
  try {
    const result = await createPlanInDatabase(supabase, TEST_CLIENT_ID, testProgramme);
    
    console.log(`   ✅ Plan created: ${result.planId}`);
    
    if (result.warnings.length > 0) {
      console.log(`   ⚠️  Warnings (${result.warnings.length}):`);
      result.warnings.forEach(w => console.log(`      - ${w}`));
    }
    
    console.log('');

    // Step 3: Validate the generated plan
    console.log('🔍 Step 3: Validating generated plan...');
    await validatePlan(result.planId);

  } catch (error: any) {
    console.error('   ❌ Error generating plan:', error.message);
    console.error('   Stack:', error.stack);
    process.exit(1);
  }
}

async function validatePlan(planId: string) {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Fetch plan days
  const { data: planDays, error: daysError } = await supabase
    .from('plan_days')
    .select('id, day_index, label, description, is_rest')
    .eq('plan_id', planId)
    .order('day_index');

  if (daysError || !planDays) {
    errors.push(`Failed to fetch plan days: ${daysError?.message}`);
    printResults(errors, warnings);
    return;
  }

  console.log(`   Found ${planDays.length} days`);

  // Check each day
  for (const day of planDays) {
    console.log(`\n   📅 Day ${day.day_index} (${day.description}):`);

    // Fetch sessions for this day
    const { data: sessions, error: sessionsError } = await supabase
      .from('sessions')
      .select(`
        id,
        name,
        notes,
        session_blocks (
          id,
          block_type,
          title,
          rounds,
          parameters,
          session_block_items (
            id,
            sets,
            reps,
            distance_m,
            duration_sec,
            rest_sec,
            exercises (
              id,
              name
            )
          )
        )
      `)
      .eq('plan_day_id', day.id);

    if (sessionsError) {
      errors.push(`Day ${day.day_index}: Failed to fetch sessions - ${sessionsError.message}`);
      continue;
    }

    if (!sessions || sessions.length === 0) {
      if (day.day_index <= 7) {
        // Week 1 - check if it's a planned rest day
        const isPlannedRestDay = !testProgramme.sessions.some(s => s.day === day.description);
        if (isPlannedRestDay) {
          errors.push(`Day ${day.day_index} (${day.description}): REST DAY but NO RECOVERY SESSION!`);
        }
      }
      console.log(`      ⚠️  No sessions found`);
      continue;
    }

    console.log(`      ✅ ${sessions.length} session(s)`);

    // Check each session
    for (const session of sessions) {
      console.log(`         - ${session.name}`);
      const blocks = (session as any).session_blocks || [];
      
      if (blocks.length === 0) {
        warnings.push(`Day ${day.day_index}: Session "${session.name}" has no blocks`);
        console.log(`           ⚠️  No blocks`);
        continue;
      }

      console.log(`           ${blocks.length} block(s)`);

      // Check each block
      for (const block of blocks) {
        const items = block.session_block_items || [];
        console.log(`           - ${block.title}: ${items.length} exercise(s)`);

        // Validate items
        for (const item of items) {
          const ex = item.exercises;
          if (!ex) {
            errors.push(`Day ${day.day_index}: Item has no exercise reference`);
            continue;
          }

          // Check for valid data
          if (item.distance_m && item.distance_m < 0) {
            errors.push(`Day ${day.day_index}: ${ex.name} has negative distance: ${item.distance_m}m`);
          }
          if (item.duration_sec && item.duration_sec < 0) {
            errors.push(`Day ${day.day_index}: ${ex.name} has negative duration: ${item.duration_sec}s`);
          }
          if (item.sets && item.sets < 0) {
            errors.push(`Day ${day.day_index}: ${ex.name} has negative sets: ${item.sets}`);
          }
          if (item.reps && item.reps < 0) {
            errors.push(`Day ${day.day_index}: ${ex.name} has negative reps: ${item.reps}`);
          }

          // Display exercise details
          const details: string[] = [];
          if (item.sets && item.reps) details.push(`${item.sets}×${item.reps}`);
          if (item.distance_m) details.push(`${Math.round(item.distance_m / 1000)}km`);
          if (item.duration_sec) details.push(`${Math.round(item.duration_sec / 60)}min`);
          
          console.log(`              • ${ex.name}${details.length ? ' (' + details.join(', ') + ')' : ''}`);
        }
      }
    }
  }

  // Check Week 2 progression
  console.log('\n   🔄 Checking Week 2 Progression...');
  await checkWeek2Progression(planDays, errors, warnings);

  console.log('');
  printResults(errors, warnings);
}

async function checkWeek2Progression(planDays: any[], errors: string[], warnings: string[]) {
  // Compare Day 1 vs Day 8, Day 6 vs Day 13 (runs)
  const comparisons = [
    { week1Day: 1, week2Day: 8, name: 'Lower Body Strength' },
    { week1Day: 6, week2Day: 13, name: 'Long Run' }
  ];

  for (const comp of comparisons) {
    const day1 = planDays.find(d => d.day_index === comp.week1Day);
    const day2 = planDays.find(d => d.day_index === comp.week2Day);

    if (!day1 || !day2) continue;

    // Fetch sessions
    const { data: week1Sessions } = await supabase
      .from('sessions')
      .select(`
        session_blocks (
          session_block_items (
            sets, reps, distance_m, duration_sec,
            exercises (name)
          )
        )
      `)
      .eq('plan_day_id', day1.id);

    const { data: week2Sessions } = await supabase
      .from('sessions')
      .select(`
        session_blocks (
          session_block_items (
            sets, reps, distance_m, duration_sec,
            exercises (name)
          )
        )
      `)
      .eq('plan_day_id', day2.id);

    if (!week1Sessions || !week2Sessions) continue;

    console.log(`\n      Comparing Day ${comp.week1Day} vs Day ${comp.week2Day} (${comp.name}):`);

    // Get first exercise from each
    const week1Items = (week1Sessions[0] as any)?.session_blocks?.[0]?.session_block_items || [];
    const week2Items = (week2Sessions[0] as any)?.session_blocks?.[0]?.session_block_items || [];

    if (week1Items.length > 0 && week2Items.length > 0) {
      const item1 = week1Items[0];
      const item2 = week2Items[0];

      // Check reps progression
      if (item1.reps && item2.reps) {
        const diff = item2.reps - item1.reps;
        console.log(`         Reps: ${item1.reps} → ${item2.reps} (${diff >= 0 ? '+' : ''}${diff})`);
        if (diff !== 2 && diff !== 0) {
          warnings.push(`Day ${comp.week2Day}: Expected +2 reps, got ${diff >= 0 ? '+' : ''}${diff}`);
        }
      }

      // Check distance progression (runs)
      if (item1.distance_m && item2.distance_m) {
        const km1 = Math.round(item1.distance_m / 1000);
        const km2 = Math.round(item2.distance_m / 1000);
        const diff = km2 - km1;
        console.log(`         Distance: ${km1}km → ${km2}km (${diff >= 0 ? '+' : ''}${diff}km)`);
        
        // Check duration matches distance at 6 min/km
        const expectedDuration = Math.round(km2 * 6 * 60);
        if (item2.duration_sec !== expectedDuration) {
          errors.push(`Day ${comp.week2Day}: Duration ${Math.round(item2.duration_sec / 60)}min doesn't match ${km2}km at 6 min/km (expected ${Math.round(expectedDuration / 60)}min)`);
        } else {
          console.log(`         Duration: ${Math.round(item1.duration_sec / 60)}min → ${Math.round(item2.duration_sec / 60)}min ✅`);
        }
      }
    }
  }
}

function printResults(errors: string[], warnings: string[]) {
  console.log('\n🧪 ========================================');
  console.log('🧪 TEST RESULTS');
  console.log('🧪 ========================================\n');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ ALL TESTS PASSED! No errors or warnings.\n');
    process.exit(0);
  }

  if (errors.length > 0) {
    console.log(`❌ ERRORS (${errors.length}):`);
    errors.forEach(e => console.log(`   - ${e}`));
    console.log('');
  }

  if (warnings.length > 0) {
    console.log(`⚠️  WARNINGS (${warnings.length}):`);
    warnings.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }

  if (errors.length > 0) {
    console.log('❌ TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('⚠️  TESTS PASSED WITH WARNINGS\n');
    process.exit(0);
  }
}

// Run the test
runTest().catch(error => {
  console.error('💥 FATAL ERROR:', error);
  process.exit(1);
});

