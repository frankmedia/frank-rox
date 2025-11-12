const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wpmmetlzrjbqvgdxqxcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbW1ldGx6cmpicXZnZHhxeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjI1MDIsImV4cCI6MjA3NjUzODUwMn0._LY444kBUTxCJD8zD7HplY1wGHtCUGRnvtxZ7YOrky8'
);

async function check() {
  // Find plans created in last 5 minutes
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  
  const { data: plans } = await supabase
    .from('plans')
    .select('id, client_id, created_at')
    .gte('created_at', fiveMinAgo)
    .order('created_at', { ascending: false })
    .limit(5);
  
  if (!plans || plans.length === 0) {
    console.log('No recent plans found');
    return;
  }
  
  console.log(`\n📋 Found ${plans.length} recent plans:\n`);
  
  for (const plan of plans) {
    console.log(`Plan ${plan.id} (client ${plan.client_id}, created ${plan.created_at})`);
    
    const { data: planDays } = await supabase
      .from('plan_days')
      .select('id, day_index, is_rest')
      .eq('plan_id', plan.id)
      .order('day_index');
    
    let week1Workout = 0, week1Recovery = 0;
    let week2Workout = 0, week2Recovery = 0;
    
    for (const day of planDays.slice(0, 7)) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('plan_day_id', day.id);
      
      const workout = sessions?.filter(s => !s.name.toLowerCase().includes('recovery')).length || 0;
      const recovery = sessions?.filter(s => s.name.toLowerCase().includes('recovery')).length || 0;
      
      week1Workout += workout;
      week1Recovery += recovery;
    }
    
    for (const day of planDays.slice(7, 14)) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('plan_day_id', day.id);
      
      const workout = sessions?.filter(s => !s.name.toLowerCase().includes('recovery')).length || 0;
      const recovery = sessions?.filter(s => s.name.toLowerCase().includes('recovery')).length || 0;
      
      week2Workout += workout;
      week2Recovery += recovery;
    }
    
    console.log(`  Week 1: ${week1Workout} workout days, ${week1Recovery} recovery days`);
    console.log(`  Week 2: ${week2Workout} workout days, ${week2Recovery} recovery days`);
    console.log('');
  }
}

check().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
