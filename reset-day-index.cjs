require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
async function run(){
  const planId='f98e87ba-69dc-4c55-b3f4-326b6b0fcfe6';
  const { data: days, error } = await supabase
    .from('plan_days')
    .select('id, label, day_index, created_at')
    .eq('plan_id', planId)
    .order('created_at');
  if(error){console.error('fetch error', error);return;}
  for(let i=0;i<days.length;i++){
    const newIndex=i+1;
    const { error: updateError } = await supabase
      .from('plan_days')
      .update({ day_index: newIndex, label: `Day ${newIndex}` })
      .eq('id', days[i].id);
    if(updateError){console.error('update error', days[i].id, updateError);return;}
    else console.log(`Updated ${days[i].id}: ${days[i].day_index} -> ${newIndex}`);
  }
}
run();
