/**
 * Program Generation Test Variations
 * 
 * Tests different training schedules:
 * - 3 days/week (minimal)
 * - 4 days/week (moderate)
 * - 5 days/week (standard)
 * - 6 days/week (advanced)
 * 
 * Usage: npx tsx src/services/programGeneration/__tests__/testVariations.ts
 */

import { createClient } from '@supabase/supabase-js';
import { createPlanInDatabase } from '../../programmeToDatabase';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const TEST_CLIENT_ID = process.env.TEST_CLIENT_ID || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ==================== TEST CONFIGURATIONS ====================

interface TestConfig {
  name: string;
  trainingDays: number;
  runsPerWeek: number;
  cardioPerWeek: number;
  expectedSessions: number; // Total sessions in Week 1
  expectedRestDays: number; // Rest days in Week 1
  focusAreas: string[];
  description: string;
}

const TEST_CONFIGS: TestConfig[] = [
  {
    name: '3-Day Beginner',
    trainingDays: 3,
    runsPerWeek: 1,
    cardioPerWeek: 0,
    expectedSessions: 3, // 1 run + 2 strength
    expectedRestDays: 4, // 7 - 3 = 4 rest days
    focusAreas: ['Running', 'Strength'],
    description: 'Minimal schedule for beginners'
  },
  {
    name: '4-Day Balanced',
    trainingDays: 4,
    runsPerWeek: 1,
    cardioPerWeek: 1,
    expectedSessions: 4, // 1 run + 1 cardio + 2 strength
    expectedRestDays: 3,
    focusAreas: ['Running', 'Strength', 'Cardio'],
    description: 'Balanced schedule with recovery'
  },
  {
    name: '5-Day Standard',
    trainingDays: 5,
    runsPerWeek: 2,
    cardioPerWeek: 1,
    expectedSessions: 5, // 2 runs + 1 cardio + 2 strength
    expectedRestDays: 2,
    focusAreas: ['Running', 'Strength', 'Cardio'],
    description: 'Standard Hyrox training schedule'
  },
  {
    name: '6-Day Advanced',
    trainingDays: 6,
    runsPerWeek: 2,
    cardioPerWeek: 2,
    expectedSessions: 6, // 2 runs + 2 cardio + 2 strength
    expectedRestDays: 1,
    focusAreas: ['Running', 'Strength', 'Cardio'],
    description: 'Advanced high-volume training'
  },
  {
    name: '5-Day Strength Focus',
    trainingDays: 5,
    runsPerWeek: 1,
    cardioPerWeek: 2,
    expectedSessions: 5, // 1 run + 2 cardio + 2 strength
    expectedRestDays: 2,
    focusAreas: ['Strength', 'Cardio'],
    description: 'Strength-focused with cardio conditioning'
  },
  {
    name: '5-Day Running Focus',
    trainingDays: 5,
    runsPerWeek: 3,
    cardioPerWeek: 0,
    expectedSessions: 5, // 3 runs + 2 strength
    expectedRestDays: 2,
    focusAreas: ['Running', 'Strength'],
    description: 'Running-focused with strength maintenance'
  }
];

// ==================== TEST RUNNER ====================

async function runAllTests() {
  console.log('🧪 ========================================');
  console.log('🧪 PROGRAM GENERATION VARIATIONS TEST');
  console.log('🧪 ========================================\n');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing Supabase credentials in environment');
    console.log('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  if (!TEST_CLIENT_ID) {
    console.error('❌ Missing TEST_CLIENT_ID in environment');
    console.log('Set TEST_CLIENT_ID to a valid client ID');
    process.exit(1);
  }

  const results: Array<{ config: TestConfig; passed: boolean; errors: string[] }> = [];

  for (let i = 0; i < TEST_CONFIGS.length; i++) {
    const config = TEST_CONFIGS[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`TEST ${i + 1}/${TEST_CONFIGS.length}: ${config.name}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Description: ${config.description}`);
    console.log(`Training Days: ${config.trainingDays}/week`);
    console.log(`Runs: ${config.runsPerWeek}/week`);
    console.log(`Cardio: ${config.cardioPerWeek}/week`);
    console.log(`Expected Sessions: ${config.expectedSessions}`);
    console.log(`Expected Rest Days: ${config.expectedRestDays}`);
    console.log('');

    const testResult = await runSingleTest(config);
    results.push(testResult);

    if (testResult.passed) {
      console.log('✅ TEST PASSED\n');
    } else {
      console.log('❌ TEST FAILED');
      testResult.errors.forEach(e => console.log(`   - ${e}`));
      console.log('');
    }

    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  printSummary(results);
}

async function runSingleTest(config: TestConfig): Promise<{ config: TestConfig; passed: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    // Step 1: Delete existing plan
    console.log('🗑️  Deleting existing plan...');
    await supabase.from('plans').delete().eq('client_id', TEST_CLIENT_ID);
    console.log('✅ Deleted\n');

    // Step 2: Build programme
    const programme = buildProgramme(config);

    // Step 3: Generate plan
    console.log('🏗️  Generating plan...');
    const result = await createPlanInDatabase(supabase, TEST_CLIENT_ID, programme);
    console.log(`✅ Plan created: ${result.planId}\n`);

    if (result.warnings.length > 0) {
      console.log(`⚠️  Warnings:`);
      result.warnings.forEach(w => console.log(`   - ${w}`));
      console.log('');
    }

    // Step 4: Validate
    console.log('🔍 Validating...');
    await validatePlan(result.planId, config, errors);

  } catch (error: any) {
    errors.push(`Fatal error: ${error.message}`);
  }

  return {
    config,
    passed: errors.length === 0,
    errors
  };
}

function buildProgramme(config: TestConfig) {
  // Build sessions based on config
  const sessions: any[] = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let dayIndex = 0;

  // Add strength sessions (always 2)
  if (config.focusAreas.includes('Strength')) {
    sessions.push({
      day: days[dayIndex++],
      type: 'strength',
      title: 'Lower Body Strength',
      effort: 'hard',
      detail: 'Squat-focused'
    });

    sessions.push({
      day: days[dayIndex++],
      type: 'strength',
      title: 'Upper Body Strength',
      effort: 'hard',
      detail: 'Push/Pull'
    });
  }

  // Add runs
  for (let i = 0; i < config.runsPerWeek; i++) {
    sessions.push({
      day: days[dayIndex++],
      type: 'run',
      title: i === 0 ? 'Long Run' : 'Intervals',
      distance: i === 0 ? '5km' : '6×500m',
      pace: i === 0 ? 'Zone 2' : 'Race pace',
      effort: i === 0 ? 'easy' : 'hard',
      detail: i === 0 ? 'Aerobic base' : 'Speed work'
    });
  }

  // Add cardio
  for (let i = 0; i < config.cardioPerWeek; i++) {
    sessions.push({
      day: days[dayIndex++],
      type: 'cardio',
      title: 'Cardio Conditioning',
      effort: 'moderate',
      detail: 'hybrid-pyramid'
    });
  }

  return {
    sessions,
    preferences: {
      trainingDaysPerWeek: config.trainingDays,
      runSessionsPerWeek: config.runsPerWeek,
      cardioSessionsPerWeek: config.cardioPerWeek,
      focusAreas: config.focusAreas,
      equipment: ['SkiErg', 'RowErg', 'Assault Bike', 'Wall balls', 'Heavy dumbbells']
    },
    generatedAt: new Date().toISOString(),
    blockNumber: 1,
    focus: 'base' as const
  };
}

async function validatePlan(planId: string, config: TestConfig, errors: string[]) {
  // Fetch plan days
  const { data: planDays } = await supabase
    .from('plan_days')
    .select('id, day_index, description, is_rest')
    .eq('plan_id', planId)
    .order('day_index');

  if (!planDays || planDays.length !== 14) {
    errors.push(`Expected 14 days, got ${planDays?.length || 0}`);
    return;
  }

  // Check Week 1 (days 1-7)
  const week1Days = planDays.slice(0, 7);
  let sessionCount = 0;
  let restDayCount = 0;
  let restDaysWithSessions = 0;

  for (const day of week1Days) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name')
      .eq('plan_day_id', day.id);

    const hasSession = sessions && sessions.length > 0;

    if (hasSession) {
      sessionCount++;
      console.log(`   ✅ Day ${day.day_index} (${day.description}): ${sessions.length} session(s)`);
    } else {
      console.log(`   ⚠️  Day ${day.day_index} (${day.description}): No sessions`);
    }

    // Check rest days
    if (day.is_rest) {
      restDayCount++;
      if (hasSession) {
        restDaysWithSessions++;
      } else {
        errors.push(`Day ${day.day_index}: Rest day but NO recovery session`);
      }
    }
  }

  console.log(`\n   Sessions in Week 1: ${sessionCount} (expected ${config.expectedSessions})`);
  console.log(`   Rest days: ${restDayCount} (expected ${config.expectedRestDays})`);
  console.log(`   Rest days with recovery: ${restDaysWithSessions}/${restDayCount}`);

  // Validate counts
  if (sessionCount !== config.expectedSessions) {
    errors.push(`Expected ${config.expectedSessions} sessions, got ${sessionCount}`);
  }

  if (restDayCount !== config.expectedRestDays) {
    errors.push(`Expected ${config.expectedRestDays} rest days, got ${restDayCount}`);
  }

  if (restDaysWithSessions !== restDayCount) {
    errors.push(`${restDayCount - restDaysWithSessions} rest day(s) missing recovery sessions`);
  }

  // Check Week 2 duplication
  console.log('\n   Checking Week 2 duplication...');
  const week2Days = planDays.slice(7, 14);
  let week2SessionCount = 0;

  for (const day of week2Days) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('plan_day_id', day.id);

    if (sessions && sessions.length > 0) {
      week2SessionCount++;
    }
  }

  console.log(`   Week 2 sessions: ${week2SessionCount} (expected ${config.expectedSessions})`);

  if (week2SessionCount !== config.expectedSessions) {
    errors.push(`Week 2: Expected ${config.expectedSessions} sessions, got ${week2SessionCount}`);
  }

  // Check progression for runs (if any)
  if (config.runsPerWeek > 0) {
    await checkRunProgression(planDays, errors);
  }
}

async function checkRunProgression(planDays: any[], errors: string[]) {
  // Find first run in Week 1 and Week 2
  for (let i = 0; i < 7; i++) {
    const day1 = planDays[i];
    const day2 = planDays[i + 7];

    const { data: week1Sessions } = await supabase
      .from('sessions')
      .select(`
        name,
        session_blocks (
          session_block_items (
            distance_m,
            duration_sec
          )
        )
      `)
      .eq('plan_day_id', day1.id)
      .ilike('name', '%run%');

    if (week1Sessions && week1Sessions.length > 0) {
      const { data: week2Sessions } = await supabase
        .from('sessions')
        .select(`
          name,
          session_blocks (
            session_block_items (
              distance_m,
              duration_sec
            )
          )
        )
        .eq('plan_day_id', day2.id)
        .ilike('name', '%run%');

      if (week2Sessions && week2Sessions.length > 0) {
        const item1 = (week1Sessions[0] as any).session_blocks?.[0]?.session_block_items?.[0];
        const item2 = (week2Sessions[0] as any).session_blocks?.[0]?.session_block_items?.[0];

        if (item1 && item2 && item1.distance_m && item2.distance_m) {
          const km1 = Math.round(item1.distance_m / 1000);
          const km2 = Math.round(item2.distance_m / 1000);
          const min1 = Math.round(item1.duration_sec / 60);
          const min2 = Math.round(item2.duration_sec / 60);

          console.log(`\n   Run progression (Day ${i + 1} → Day ${i + 8}):`);
          console.log(`      Week 1: ${km1}km • ${min1}min`);
          console.log(`      Week 2: ${km2}km • ${min2}min`);

          // Check duration matches distance
          const expectedMin = km2 * 6;
          if (min2 !== expectedMin) {
            errors.push(`Day ${i + 8}: Duration ${min2}min doesn't match ${km2}km at 6 min/km (expected ${expectedMin}min)`);
          } else {
            console.log(`      ✅ Duration correct`);
          }
        }
        break; // Only check first run
      }
    }
  }
}

function printSummary(results: Array<{ config: TestConfig; passed: boolean; errors: string[] }>) {
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('Failed Tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`\n❌ ${r.config.name}:`);
      r.errors.forEach(e => console.log(`   - ${e}`));
    });
  }

  console.log('\n' + '='.repeat(60));

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

// Run all tests
runAllTests().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});

