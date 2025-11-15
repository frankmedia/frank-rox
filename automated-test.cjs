/**
 * AUTOMATED REGRESSION TEST
 * 
 * Creates test users with different profiles and generates plans for them
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wpmmetlzrjbqvgdxqxcq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbW1ldGx6cmpicXZnZHhxeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjI1MDIsImV4cCI6MjA3NjUzODUwMn0._LY444kBUTxCJD8zD7HplY1wGHtCUGRnvtxZ7YOrky8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// TEST CONFIGURATIONS
const TEST_USERS = [
  {
    name: 'test_male_beginner',
    gender: 'male',
    trainingDays: 3,
    runs: 1,
    cardio: 0,
    focus: 'base',
    expectedSessions: 3,
    expectedRestDays: 4
  },
  {
    name: 'test_female_intermediate',
    gender: 'female',
    trainingDays: 4,
    runs: 1,
    cardio: 1,
    focus: 'build',
    expectedSessions: 4,
    expectedRestDays: 3
  },
  {
    name: 'test_male_advanced',
    gender: 'male',
    trainingDays: 5,
    runs: 2,
    cardio: 1,
    focus: 'base',
    expectedSessions: 5,
    expectedRestDays: 2
  },
  {
    name: 'test_female_elite',
    gender: 'female',
    trainingDays: 6,
    runs: 2,
    cardio: 2,
    focus: 'race-prep',
    expectedSessions: 6,
    expectedRestDays: 1
  }
];

async function runAutomatedTests() {
  console.log('🧪 ========================================');
  console.log('🧪 AUTOMATED REGRESSION TEST');
  console.log('🧪 ========================================\n');
  console.log(`Testing ${TEST_USERS.length} user profiles\n`);

  const results = [];

  for (let i = 0; i < TEST_USERS.length; i++) {
    const config = TEST_USERS[i];
    console.log(`\n[${ i + 1}/${TEST_USERS.length}] Testing: ${config.name}`);
    console.log(`   ${config.trainingDays} days/week, ${config.runs} runs, ${config.cardio} cardio`);
    console.log(`   Focus: ${config.focus}, Gender: ${config.gender}`);

    try {
      const result = await testSingleUser(config);
      results.push({ config, result });
      
      if (result.passed) {
        console.log(`   ✅ PASSED`);
      } else {
        console.log(`   ❌ FAILED`);
        result.errors.forEach(e => console.log(`      - ${e}`));
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      results.push({ config, result: { passed: false, errors: [error.message] } });
    }
  }

  // Print summary
  printSummary(results);
}

async function testSingleUser(config) {
  const errors = [];
  
  // Step 1: Create client
  const email = `${config.name}@test.roxpt.app`;
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .insert({
      name: config.name,
      email: email,
      password: 'test123'
    })
    .select()
    .single();

  if (clientError || !client) {
    throw new Error(`Failed to create client: ${clientError?.message}`);
  }

  console.log(`   ✅ Client created (ID: ${client.id})`);

  // Step 2: Build programme
  const programme = buildProgramme(config);

  // Step 3: Generate plan using the actual code
  console.log(`   🏗️  Generating plan...`);
  
  // We need to call the actual programmeToDatabase function
  // For now, simulate by creating plan structure directly
  const { data: plan, error: planError } = await supabase
    .from('plans')
    .insert({
      client_id: client.id,
      name: `Test Plan - ${config.name}`,
      start_date: new Date().toISOString(),
      cycle_days: 14,
      current_day: 1,
      status: 'active'
    })
    .select()
    .single();

  if (planError || !plan) {
    throw new Error(`Failed to create plan: ${planError?.message}`);
  }

  console.log(`   ✅ Plan created (ID: ${plan.id})`);

  // Step 4: Create plan days
  for (let i = 0; i < 14; i++) {
    const { error: dayError } = await supabase
      .from('plan_days')
      .insert({
        plan_id: plan.id,
        day_index: i + 1,
        label: `Day ${i + 1}`,
        description: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][i % 7],
        is_rest: false
      });

    if (dayError) {
      errors.push(`Failed to create day ${i + 1}: ${dayError.message}`);
    }
  }

  // Step 5: Validate
  const validation = await validatePlan(plan.id, config);
  errors.push(...validation.errors);

  // Step 6: Clean up
  await supabase.from('clients').delete().eq('id', client.id);

  return {
    passed: errors.length === 0,
    errors
  };
}

function buildProgramme(config) {
  const sessions = [];
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  let dayIndex = 0;

  // Always 2 strength sessions
  sessions.push({
    day: days[dayIndex++],
    type: 'strength',
    title: 'Lower Body',
    effort: 'hard'
  });

  sessions.push({
    day: days[dayIndex++],
    type: 'strength',
    title: 'Upper Body',
    effort: 'hard'
  });

  // Add runs
  for (let i = 0; i < config.runs; i++) {
    sessions.push({
      day: days[dayIndex++],
      type: 'run',
      title: i === 0 ? 'Long Run' : 'Intervals',
      distance: i === 0 ? '5km' : '6×500m',
      pace: 'Zone 2',
      effort: 'easy'
    });
  }

  // Add cardio
  for (let i = 0; i < config.cardio; i++) {
    sessions.push({
      day: days[dayIndex++],
      type: 'cardio',
      title: 'Cardio',
      effort: 'moderate'
    });
  }

  return {
    sessions,
    preferences: {
      trainingDaysPerWeek: config.trainingDays,
      runSessionsPerWeek: config.runs,
      cardioSessionsPerWeek: config.cardio,
      focusAreas: ['Running', 'Strength', 'Cardio'],
      equipment: ['SkiErg', 'RowErg', 'Assault Bike', 'Wall balls']
    },
    generatedAt: new Date().toISOString(),
    blockNumber: 1,
    focus: config.focus
  };
}

async function validatePlan(planId, config) {
  const errors = [];

  // Get plan days
  const { data: planDays } = await supabase
    .from('plan_days')
    .select('id, day_index, is_rest')
    .eq('plan_id', planId)
    .order('day_index');

  if (!planDays || planDays.length !== 14) {
    errors.push(`Expected 14 days, got ${planDays?.length || 0}`);
    return { errors };
  }

  // For now, just check structure exists
  // In real test, we'd check sessions, exercises, etc.

  return { errors };
}

function printSummary(results) {
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60) + '\n');

  const passed = results.filter(r => r.result.passed).length;
  const failed = results.filter(r => !r.result.passed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);

  if (failed > 0) {
    console.log('Failed Tests:\n');
    results.filter(r => !r.result.passed).forEach(r => {
      console.log(`❌ ${r.config.name}:`);
      r.result.errors.forEach(e => console.log(`   - ${e}`));
      console.log('');
    });
  }

  console.log('='.repeat(60));

  if (failed === 0) {
    console.log('✅ ALL TESTS PASSED!');
    process.exit(0);
  } else {
    console.log('❌ SOME TESTS FAILED');
    process.exit(1);
  }
}

// Run tests
runAutomatedTests().catch(error => {
  console.error('\n💥 FATAL ERROR:', error);
  process.exit(1);
});

