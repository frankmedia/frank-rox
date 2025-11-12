const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wpmmetlzrjbqvgdxqxcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbW1ldGx6cmpicXZnZHhxeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjI1MDIsImV4cCI6MjA3NjUzODUwMn0._LY444kBUTxCJD8zD7HplY1wGHtCUGRnvtxZ7YOrky8'
);

async function checkAllSessions() {
  const { data: plan } = await supabase
    .from('plans')
    .select('id, client_id')
    .eq('id', 'ff9aee28-3d28-4bda-8dfa-3176764aa84c')
    .single();
  
  if (!plan) {
    console.log('Plan not found');
    return;
  }
  
  console.log(`\n📋 Plan ${plan.id} (client ${plan.client_id})\n`);
  
  const { data: planDays } = await supabase
    .from('plan_days')
    .select('id, day_index, description')
    .eq('plan_id', plan.id)
    .order('day_index');
  
  for (const day of planDays) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name')
      .eq('plan_day_id', day.id);
    
    console.log(`Day ${day.day_index} (${day.description}): ${sessions?.length || 0} sessions`);
    sessions?.forEach(s => console.log(`  - ${s.name}`));
  }
}

checkAllSessions().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
