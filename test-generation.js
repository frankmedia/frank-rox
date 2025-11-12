/**
 * Quick Test Script for Program Generation
 * 
 * Usage:
 * 1. Update SUPABASE_URL, SUPABASE_ANON_KEY, and TEST_CLIENT_ID below
 * 2. Run: node test-generation.js
 */

const { createClient } = require('@supabase/supabase-js');

// ========================================
// CONFIGURATION - UPDATE THESE VALUES
// ========================================
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const TEST_CLIENT_ID = 'your-test-client-id'; // Get this from your database

// ========================================
// TEST SCRIPT
// ========================================

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testProgramGeneration() {
  console.log('🧪 ========================================');
  console.log('🧪 QUICK PROGRAM GENERATION TEST');
  console.log('🧪 ========================================\n');

  // Step 1: Check if client exists
  console.log('1️⃣  Checking if client exists...');
  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('id', TEST_CLIENT_ID)
    .single();

  if (clientError || !client) {
    console.error('❌ Client not found:', clientError?.message);
    console.log('\nℹ️  To find a client ID, run this SQL in Supabase:');
    console.log('   SELECT id, name, email FROM clients LIMIT 5;');
    process.exit(1);
  }

  console.log(`✅ Found client: ${client.name} (${client.email})\n`);

  // Step 2: Check existing plan
  console.log('2️⃣  Checking for existing plans...');
  const { data: existingPlans } = await supabase
    .from('plans')
    .select('id, name, status, cycle_days')
    .eq('client_id', TEST_CLIENT_ID);

  if (existingPlans && existingPlans.length > 0) {
    console.log(`✅ Found ${existingPlans.length} existing plan(s):`);
    existingPlans.forEach(p => {
      console.log(`   - ${p.name} (${p.status}, ${p.cycle_days} days)`);
    });
  } else {
    console.log('⚠️  No existing plans found');
  }
  console.log('');

  // Step 3: Check plan days
  if (existingPlans && existingPlans.length > 0) {
    const planId = existingPlans[0].id;
    
    console.log('3️⃣  Analyzing plan structure...');
    const { data: planDays } = await supabase
      .from('plan_days')
      .select('id, day_index, label, description, is_rest')
      .eq('plan_id', planId)
      .order('day_index');

    if (planDays) {
      console.log(`✅ Found ${planDays.length} days\n`);

      // Check each day for sessions
      for (const day of planDays.slice(0, 14)) { // First 14 days
        const { data: sessions } = await supabase
          .from('sessions')
          .select(`
            id,
            name,
            session_blocks (
              id,
              title,
              session_block_items (
                id,
                sets,
                reps,
                distance_m,
                duration_sec,
                exercises (name)
              )
            )
          `)
          .eq('plan_day_id', day.id);

        const sessionCount = sessions?.length || 0;
        const exerciseCount = sessions?.reduce((total, s) => {
          const blocks = s.session_blocks || [];
          return total + blocks.reduce((t, b) => t + (b.session_block_items?.length || 0), 0);
        }, 0) || 0;

        const icon = sessionCount === 0 ? '⚠️ ' : '✅';
        console.log(`${icon} Day ${day.day_index} (${day.description}): ${sessionCount} session(s), ${exerciseCount} exercise(s)`);

        // Show first exercise details for runs
        if (sessions && sessions.length > 0) {
          const firstBlock = sessions[0].session_blocks?.[0];
          const firstItem = firstBlock?.session_block_items?.[0];
          if (firstItem && firstItem.distance_m) {
            const km = (firstItem.distance_m / 1000).toFixed(1);
            const min = Math.round(firstItem.duration_sec / 60);
            console.log(`      ${firstItem.exercises.name}: ${km}km • ${min}min`);
          }
        }
      }
      console.log('');

      // Check Week 2 progression for runs
      console.log('4️⃣  Checking Week 2 run progression...');
      const day6 = planDays.find(d => d.day_index === 6);
      const day13 = planDays.find(d => d.day_index === 13);

      if (day6 && day13) {
        const { data: week1Run } = await supabase
          .from('sessions')
          .select(`
            session_blocks (
              session_block_items (
                distance_m,
                duration_sec,
                exercises (name)
              )
            )
          `)
          .eq('plan_day_id', day6.id)
          .single();

        const { data: week2Run } = await supabase
          .from('sessions')
          .select(`
            session_blocks (
              session_block_items (
                distance_m,
                duration_sec,
                exercises (name)
              )
            )
          `)
          .eq('plan_day_id', day13.id)
          .single();

        if (week1Run && week2Run) {
          const item1 = week1Run.session_blocks?.[0]?.session_block_items?.[0];
          const item2 = week2Run.session_blocks?.[0]?.session_block_items?.[0];

          if (item1 && item2) {
            const km1 = (item1.distance_m / 1000).toFixed(1);
            const km2 = (item2.distance_m / 1000).toFixed(1);
            const min1 = Math.round(item1.duration_sec / 60);
            const min2 = Math.round(item2.duration_sec / 60);

            console.log(`   Week 1 (Day 6):  ${km1}km • ${min1}min`);
            console.log(`   Week 2 (Day 13): ${km2}km • ${min2}min`);

            // Validate duration matches distance at 6 min/km
            const expectedMin = Math.round((item2.distance_m / 1000) * 6);
            if (min2 === expectedMin) {
              console.log(`   ✅ Duration correct (${min2}min = ${km2}km × 6 min/km)`);
            } else {
              console.log(`   ❌ Duration WRONG! Expected ${expectedMin}min for ${km2}km at 6 min/km`);
            }
          }
        }
      }
      console.log('');

      // Check for rest day recovery sessions
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
          console.log(`   ❌ Day ${restDay.day_index}: MISSING recovery session!`);
        }
      }
    }
  }

  console.log('\n🧪 ========================================');
  console.log('🧪 TEST COMPLETE');
  console.log('🧪 ========================================\n');
}

// Run the test
testProgramGeneration().catch(error => {
  console.error('\n💥 ERROR:', error.message);
  console.error(error.stack);
  process.exit(1);
});

