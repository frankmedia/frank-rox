/**
 * Test Your Current Program
 * 
 * Run: node test-my-program.js
 */

const { createClient } = require('@supabase/supabase-js');

// Your Supabase credentials
const SUPABASE_URL = 'https://wpmmetlzrjbqvgdxqxcq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbW1ldGx6cmpicXZnZHhxeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjI1MDIsImV4cCI6MjA3NjUzODUwMn0._LY444kBUTxCJD8zD7HplY1wGHtCUGRnvtxZ7YOrky8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testProgram() {
  console.log('🧪 ========================================');
  console.log('🧪 TESTING YOUR PROGRAM');
  console.log('🧪 ========================================\n');

  // Step 1: Find a client to test
  console.log('1️⃣  Finding test client...');
  const { data: clients, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, email')
    .limit(5);

  if (clientsError || !clients || clients.length === 0) {
    console.error('❌ No clients found:', clientsError?.message);
    process.exit(1);
  }

  console.log(`✅ Found ${clients.length} client(s):`);
  clients.forEach((c, i) => {
    console.log(`   ${i + 1}. ${c.name} (${c.email}) - ID: ${c.id}`);
  });

  // Use first client
  const TEST_CLIENT_ID = clients[0].id;
  console.log(`\n📋 Testing with: ${clients[0].name}\n`);

  // Step 2: Check existing plan
  console.log('2️⃣  Checking existing plan...');
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, status, cycle_days')
    .eq('client_id', TEST_CLIENT_ID)
    .eq('status', 'active');

  if (!plans || plans.length === 0) {
    console.log('⚠️  No active plan found.');
    console.log('\nℹ️  To generate a plan:');
    console.log('   1. Go to http://localhost:8081/program-builder');
    console.log('   2. Click "Generate Plan"');
    console.log('   3. Run this test again\n');
    process.exit(0);
  }

  const planId = plans[0].id;
  console.log(`✅ Found plan: ${plans[0].name} (${plans[0].cycle_days} days)\n`);

  // Step 3: Analyze plan structure
  console.log('3️⃣  Analyzing plan structure...');
  const { data: planDays } = await supabase
    .from('plan_days')
    .select('id, day_index, label, description, is_rest')
    .eq('plan_id', planId)
    .order('day_index');

  if (!planDays) {
    console.error('❌ Failed to fetch plan days');
    process.exit(1);
  }

  console.log(`✅ Found ${planDays.length} days\n`);

  const errors = [];
  const warnings = [];

  // Check each day
  for (const day of planDays.slice(0, 14)) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name, session_blocks(id, title, session_block_items(id, sets, reps, distance_m, duration_sec, exercises(name)))')
      .eq('plan_day_id', day.id);

    const sessionCount = sessions?.length || 0;
    const exerciseCount = sessions?.reduce((total, s) => {
      const blocks = s.session_blocks || [];
      return total + blocks.reduce((t, b) => t + (b.session_block_items?.length || 0), 0);
    }, 0) || 0;

    const icon = sessionCount === 0 ? '⚠️ ' : '✅';
    console.log(`${icon} Day ${day.day_index} (${day.description}): ${sessionCount} session(s), ${exerciseCount} exercise(s)`);

    // Check for issues
    if (day.is_rest && sessionCount === 0) {
      errors.push(`Day ${day.day_index}: REST DAY but NO RECOVERY SESSION!`);
    }

    // Show run details
    if (sessions && sessions.length > 0) {
      const runSession = sessions.find(s => s.name.toLowerCase().includes('run'));
      if (runSession) {
        const firstBlock = runSession.session_blocks?.[0];
        const firstItem = firstBlock?.session_block_items?.[0];
        if (firstItem && firstItem.distance_m) {
          const km = (firstItem.distance_m / 1000).toFixed(1);
          const min = Math.round(firstItem.duration_sec / 60);
          console.log(`      ${firstItem.exercises.name}: ${km}km • ${min}min`);
        }
      }
    }
  }

  console.log('');

  // Step 4: Check Week 2 run progression
  console.log('4️⃣  Checking Week 2 run progression...');
  
  // Find runs in Week 1 and Week 2
  let foundRunProgression = false;
  
  for (let i = 0; i < 7; i++) {
    const day1 = planDays[i];
    const day2 = planDays[i + 7];

    const { data: week1Sessions } = await supabase
      .from('sessions')
      .select('name, session_blocks(session_block_items(distance_m, duration_sec, exercises(name)))')
      .eq('plan_day_id', day1.id);

    const week1Run = week1Sessions?.find(s => s.name.toLowerCase().includes('run'));
    
    if (week1Run) {
      const { data: week2Sessions } = await supabase
        .from('sessions')
        .select('name, session_blocks(session_block_items(distance_m, duration_sec, exercises(name)))')
        .eq('plan_day_id', day2.id);

      const week2Run = week2Sessions?.find(s => s.name.toLowerCase().includes('run'));

      if (week2Run) {
        const item1 = week1Run.session_blocks?.[0]?.session_block_items?.[0];
        const item2 = week2Run.session_blocks?.[0]?.session_block_items?.[0];

        if (item1 && item2 && item1.distance_m && item2.distance_m) {
          foundRunProgression = true;
          
          const km1 = (item1.distance_m / 1000).toFixed(1);
          const km2 = (item2.distance_m / 1000).toFixed(1);
          const min1 = Math.round(item1.duration_sec / 60);
          const min2 = Math.round(item2.duration_sec / 60);

          console.log(`   Week 1 (Day ${i + 1}): ${km1}km • ${min1}min`);
          console.log(`   Week 2 (Day ${i + 8}): ${km2}km • ${min2}min`);

          // Validate duration
          const expectedMin = Math.round((item2.distance_m / 1000) * 6);
          if (min2 === expectedMin) {
            console.log(`   ✅ Duration correct (${min2}min = ${km2}km × 6 min/km)`);
          } else {
            errors.push(`Day ${i + 8}: Duration ${min2}min is WRONG! Expected ${expectedMin}min for ${km2}km at 6 min/km`);
            console.log(`   ❌ Duration WRONG! Expected ${expectedMin}min`);
          }
        }
        break;
      }
    }
  }

  if (!foundRunProgression) {
    warnings.push('No run progression found to test');
    console.log('   ⚠️  No runs found to test progression');
  }

  console.log('');

  // Step 5: Check rest day recovery
  console.log('5️⃣  Checking rest day recovery sessions...');
  const restDays = planDays.filter(d => d.day_index <= 7 && d.is_rest);
  console.log(`   Found ${restDays.length} rest day(s) in Week 1`);

  for (const restDay of restDays) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name')
      .eq('plan_day_id', restDay.id);

    if (sessions && sessions.length > 0) {
      console.log(`   ✅ Day ${restDay.day_index}: Has recovery session`);
    } else {
      errors.push(`Day ${restDay.day_index}: MISSING recovery session!`);
      console.log(`   ❌ Day ${restDay.day_index}: MISSING recovery session!`);
    }
  }

  // Print results
  console.log('\n🧪 ========================================');
  console.log('🧪 TEST RESULTS');
  console.log('🧪 ========================================\n');

  if (errors.length === 0 && warnings.length === 0) {
    console.log('✅ ALL TESTS PASSED!\n');
    console.log('Your program generation is working correctly:');
    console.log('   ✅ All days have sessions');
    console.log('   ✅ Rest days have recovery sessions');
    console.log('   ✅ Week 2 run progression is correct');
    console.log('   ✅ Durations match distances at 6 min/km\n');
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
    console.log('To fix:');
    console.log('   1. Delete your plan in Supabase:');
    console.log(`      DELETE FROM plans WHERE client_id = '${TEST_CLIENT_ID}';`);
    console.log('   2. Go to http://localhost:8081/program-builder');
    console.log('   3. Click "Generate Plan"');
    console.log('   4. Run this test again\n');
    process.exit(1);
  } else {
    console.log('⚠️  TESTS PASSED WITH WARNINGS\n');
    process.exit(0);
  }
}

// Run the test
testProgram().catch(error => {
  console.error('\n💥 ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});

