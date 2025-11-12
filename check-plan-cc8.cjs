const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wpmmetlzrjbqvgdxqxcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbW1ldGx6cmpicXZnZHhxeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjI1MDIsImV4cCI6MjA3NjUzODUwMn0._LY444kBUTxCJD8zD7HplY1wGHtCUGRnvtxZ7YOrky8'
);

async function check() {
  const planId = 'cc8dc92c-55b3-46c8-85ba-c400865ff514';
  
  const { data: plan } = await supabase
    .from('plans')
    .select('*')
    .eq('id', planId)
    .single();
  
  if (!plan) {
    console.log(`❌ Plan ${planId} NOT FOUND!`);
    return;
  }
  
  console.log(`✅ Plan ${planId} exists (client ${plan.client_id})`);
  
  const { data: planDays } = await supabase
    .from('plan_days')
    .select('id, day_index, is_rest')
    .eq('plan_id', planId)
    .order('day_index');
  
  console.log(`\nWeek 1:`);
  for (const day of planDays.slice(0, 7)) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name')
      .eq('plan_day_id', day.id);
    
    const workout = sessions?.filter(s => !s.name.toLowerCase().includes('recovery')) || [];
    const recovery = sessions?.filter(s => s.name.toLowerCase().includes('recovery')) || [];
    
    console.log(`  Day ${day.day_index}: is_rest=${day.is_rest}, workout=${workout.length}, recovery=${recovery.length}`);
    sessions?.forEach(s => console.log(`    - ${s.name}`));
  }
  
  console.log(`\nWeek 2:`);
  for (const day of planDays.slice(7, 14)) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name')
      .eq('plan_day_id', day.id);
    
    const workout = sessions?.filter(s => !s.name.toLowerCase().includes('recovery')) || [];
    const recovery = sessions?.filter(s => s.name.toLowerCase().includes('recovery')) || [];
    
    console.log(`  Day ${day.day_index}: is_rest=${day.is_rest}, workout=${workout.length}, recovery=${recovery.length}`);
    sessions?.forEach(s => console.log(`    - ${s.name}`));
  }
}

check().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
