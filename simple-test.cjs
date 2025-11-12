/**
 * SIMPLE TEST: Just check if Day 2 has fucking exercises
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://wpmmetlzrjbqvgdxqxcq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbW1ldGx6cmpicXZnZHhxeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjI1MDIsImV4cCI6MjA3NjUzODUwMn0._LY444kBUTxCJD8zD7HplY1wGHtCUGRnvtxZ7YOrky8';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function simpleTest() {
  console.log('🧪 SIMPLE TEST: Check Day 2\n');

  // Get frank's plan (client_id = 40)
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name')
    .eq('client_id', 40)
    .eq('status', 'active')
    .limit(1);

  if (!plans || plans.length === 0) {
    console.log('❌ No plan found for frank (client_id = 40)');
    console.log('\n👉 Go to http://localhost:8081/program-builder and generate a plan!\n');
    process.exit(1);
  }

  console.log(`✅ Found plan: ${plans[0].name}\n`);

  // Get Day 2
  const { data: day2 } = await supabase
    .from('plan_days')
    .select('id, day_index, description')
    .eq('plan_id', plans[0].id)
    .eq('day_index', 2)
    .single();

  if (!day2) {
    console.log('❌ Day 2 not found');
    process.exit(1);
  }

  // Get sessions for Day 2
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, session_blocks(session_block_items(id, exercises(name)))')
    .eq('plan_day_id', day2.id);

  const sessionCount = sessions?.length || 0;
  const exerciseCount = sessions?.reduce((total, s) => {
    const blocks = s.session_blocks || [];
    return total + blocks.reduce((t, b) => t + (b.session_block_items?.length || 0), 0);
  }, 0) || 0;

  console.log(`Day 2 (${day2.description}):`);
  console.log(`   Sessions: ${sessionCount}`);
  console.log(`   Exercises: ${exerciseCount}\n`);

  if (exerciseCount === 0) {
    console.log('❌ FAILED: Day 2 has 0 exercises!');
    console.log('\n👉 The refactor didn\'t work OR you\'re looking at an old plan.');
    console.log('👉 Delete the plan and regenerate:\n');
    console.log('   DELETE FROM plans WHERE client_id = 40;\n');
    console.log('   Then go to /program-builder and generate a new plan.\n');
    process.exit(1);
  }

  if (exerciseCount === 13) {
    console.log('✅ PASSED: Day 2 has 13 exercises (recovery session)!\n');
    process.exit(0);
  }

  console.log(`⚠️  WARNING: Day 2 has ${exerciseCount} exercises (expected 13)\n`);
  process.exit(0);
}

simpleTest().catch(error => {
  console.error('💥 ERROR:', error.message);
  process.exit(1);
});

