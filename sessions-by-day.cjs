require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run(){
  const planId='f98e87ba-69dc-4c55-b3f4-326b6b0fcfe6';
  const { data: days } = await supabase
    .from('plan_days')
    .select('id, day_index')
    .eq('plan_id', planId)
    .order('day_index');
  if(!days){console.log('no days');return;}
  for(const day of days){
    const { count } = await supabase
      .from('sessions')
      .select('id', { count: 'exact', head: true })
      .eq('plan_day_id', day.id);
    console.log(`Day ${day.day_index}: ${count || 0} session(s)`);
  }
}
run();
