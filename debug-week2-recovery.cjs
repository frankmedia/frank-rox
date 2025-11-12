const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wpmmetlzrjbqvgdxqxcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbW1ldGx6cmpicXZnZHhxeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjI1MDIsImV4cCI6MjA3NjUzODUwMn0._LY444kBUTxCJD8zD7HplY1wGHtCUGRnvtxZ7YOrky8'
);

async function debug() {
  const { data: plans } = await supabase
    .from('plans')
    .select('id')
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (!plans || plans.length === 0) {
    console.log('No plans found');
    return;
  }
  
  const planId = plans[0].id;
  console.log(`\n📋 Checking plan: ${planId}\n`);
  
  const { data: planDays } = await supabase
    .from('plan_days')
    .select('id, day_index, description, is_rest')
    .eq('plan_id', planId)
    .order('day_index');
  
  console.log('WEEK 1:');
  for (const day of planDays.slice(0, 7)) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name')
      .eq('plan_day_id', day.id);
    
    console.log(`Day ${day.day_index}: is_rest=${day.is_rest}, sessions=${sessions?.length || 0}`);
    sessions?.forEach(s => console.log(`  - ${s.name}`));
  }
  
  console.log('\nWEEK 2:');
  for (const day of planDays.slice(7, 14)) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id, name')
      .eq('plan_day_id', day.id);
    
    console.log(`Day ${day.day_index}: is_rest=${day.is_rest}, sessions=${sessions?.length || 0}`);
    sessions?.forEach(s => console.log(`  - ${s.name}`));
  }
}

debug().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
