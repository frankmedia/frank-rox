const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wpmmetlzrjbqvgdxqxcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbW1ldGx6cmpicXZnZHhxeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjI1MDIsImV4cCI6MjA3NjUzODUwMn0._LY444kBUTxCJD8zD7HplY1wGHtCUGRnvtxZ7YOrky8'
);

async function check() {
  const { data: plans } = await supabase
    .from('plans')
    .select('id, client_id, created_at')
    .order('created_at', { ascending: false })
    .limit(10);
  
  console.log(`\n📋 Latest ${plans?.length || 0} plans:\n`);
  
  if (!plans || plans.length === 0) {
    console.log('No plans found at all!');
    return;
  }
  
  for (const plan of plans) {
    const { data: planDays } = await supabase
      .from('plan_days')
      .select('id, day_index, is_rest')
      .eq('plan_id', plan.id)
      .order('day_index');
    
    let week1Sessions = 0, week2Sessions = 0;
    
    for (const day of planDays?.slice(0, 7) || []) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('plan_day_id', day.id);
      week1Sessions += sessions?.length || 0;
    }
    
    for (const day of planDays?.slice(7, 14) || []) {
      const { data: sessions } = await supabase
        .from('sessions')
        .select('id, name')
        .eq('plan_day_id', day.id);
      week2Sessions += sessions?.length || 0;
    }
    
    console.log(`${plan.id} (client ${plan.client_id})`);
    console.log(`  Created: ${plan.created_at}`);
    console.log(`  Week 1: ${week1Sessions} sessions, Week 2: ${week2Sessions} sessions\n`);
  }
}

check().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
