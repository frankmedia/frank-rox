const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function completeCleanup() {
  console.log('🧹 COMPLETE CLEANUP FOR TEST11\n');
  
  // Get test11 user (latest)
  const { data: users } = await supabase
    .from('clients')
    .select('id, name, email')
    .eq('name', 'test11')
    .order('id', { ascending: false })
    .limit(1);
  
  if (!users || users.length === 0) {
    console.error('❌ No test11 user found');
    return;
  }
  
  const user = users[0];
  console.log('✅ Found user:', user);
  
  // 1. Check existing plans
  console.log('\n📋 Checking existing plans...');
  const { data: existingPlans } = await supabase
    .from('plans')
    .select('id, name, status, created_at')
    .eq('client_id', user.id);
  
  if (existingPlans && existingPlans.length > 0) {
    console.log(`   Found ${existingPlans.length} plan(s):`);
    existingPlans.forEach(p => {
      console.log(`   - ${p.name} (${p.status}) - Created: ${p.created_at}`);
    });
    
    // Delete all plans
    console.log('\n🗑️  Deleting all plans...');
    const { error: deleteError } = await supabase
      .from('plans')
      .delete()
      .eq('client_id', user.id);
    
    if (deleteError) {
      console.error('❌ Error deleting plans:', deleteError);
      return;
    }
    console.log('✅ All plans deleted (cascade deleted sessions, blocks, items)');
  } else {
    console.log('   No existing plans found');
  }
  
  // 2. Verify deletion
  console.log('\n🔍 Verifying deletion...');
  const { data: remainingPlans } = await supabase
    .from('plans')
    .select('id')
    .eq('client_id', user.id);
  
  const { data: remainingSessions } = await supabase
    .from('sessions')
    .select('id, plan_day_id')
    .in('plan_day_id', 
      await supabase
        .from('plan_days')
        .select('id')
        .in('plan_id', 
          await supabase
            .from('plans')
            .select('id')
            .eq('client_id', user.id)
        )
    );
  
  console.log(`   Plans: ${remainingPlans?.length || 0}`);
  console.log(`   Sessions: ${remainingSessions?.length || 0}`);
  
  if ((remainingPlans?.length || 0) === 0 && (remainingSessions?.length || 0) === 0) {
    console.log('✅ Database is clean!');
  } else {
    console.log('⚠️  Some data still remains');
  }
  
  // 3. Instructions for localStorage cleanup
  console.log('\n📝 NEXT STEPS:');
  console.log('   1. Open your browser');
  console.log('   2. Go to http://localhost:8081');
  console.log('   3. Open DevTools (F12)');
  console.log('   4. Go to Console tab');
  console.log('   5. Run these commands:');
  console.log('');
  console.log('      localStorage.removeItem("current_programme");');
  console.log('      localStorage.removeItem("current_plan_id");');
  console.log('      localStorage.removeItem("currentTrainingDay_test11");');
  console.log('      console.log("✅ LocalStorage cleared");');
  console.log('');
  console.log('   6. Refresh the page (Ctrl+R or Cmd+R)');
  console.log('   7. Log in as test11');
  console.log('   8. Go to /programme-builder');
  console.log('   9. Generate a NEW plan');
  console.log('');
  console.log('✅ The new plan will have:');
  console.log('   - Day 2: Active Recovery (6 exercises)');
  console.log('   - Day 9: Active Recovery (6 exercises)');
  console.log('   - All Ski-Row Threshold sessions with 3 circuits');
  console.log('   - All run intervals in correct order');
}

completeCleanup().catch(console.error);


