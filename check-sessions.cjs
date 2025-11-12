const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wpmmetlzrjbqvgdxqxcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbW1ldGx6cmpicXZnZHhxeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjI1MDIsImV4cCI6MjA3NjUzODUwMn0._LY444kBUTxCJD8zD7HplY1wGHtCUGRnvtxZ7YOrky8'
);

async function checkSessions() {
  // Find the most recent plan
  const { data: plans } = await supabase
    .from('plans')
    .select('id, client_id, created_at')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (!plans || plans.length === 0) {
    console.log('No plans found');
    return;
  }
  
  const plan = plans[0];
  console.log(`\n📋 Checking plan ${plan.id} (client ${plan.client_id})\n`);
  
  // Get all plan days
  const { data: planDays } = await supabase
    .from('plan_days')
    .select('id, day_index, description')
    .eq('plan_id', plan.id)
    .order('day_index');
  
  console.log(`Found ${planDays.length} days\n`);
  
  // Check Week 1 (days 1-7)
  let week1WorkoutDays = 0;
  let week1RecoveryDays = 0;
  
  for (const day of planDays.slice(0, 7)) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name')
      .eq('plan_day_id', day.id);
    
    if (!sessions || sessions.length === 0) {
      console.log(`Day ${day.day_index} (${day.description}): NO SESSIONS`);
      continue;
    }
    
    const workoutSessions = sessions.filter(s => !s.name.toLowerCase().includes('recovery'));
    const recoverySessions = sessions.filter(s => s.name.toLowerCase().includes('recovery'));
    
    if (workoutSessions.length > 0) {
      week1WorkoutDays++;
      console.log(`Day ${day.day_index} (${day.description}): ${workoutSessions.length} WORKOUT session(s)`);
      workoutSessions.forEach(s => console.log(`  - ${s.name}`));
    }
    
    if (recoverySessions.length > 0) {
      week1RecoveryDays++;
      console.log(`Day ${day.day_index} (${day.description}): ${recoverySessions.length} RECOVERY session(s)`);
      recoverySessions.forEach(s => console.log(`  - ${s.name}`));
    }
  }
  
  console.log(`\n✅ Week 1 Summary:`);
  console.log(`   Days with workout sessions: ${week1WorkoutDays}`);
  console.log(`   Days with recovery sessions: ${week1RecoveryDays}`);
}

checkSessions().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
