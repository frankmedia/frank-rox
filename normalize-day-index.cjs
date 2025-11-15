require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run(){
  const planId='f98e87ba-69dc-4c55-b3f4-326b6b0fcfe6';
  const { data: days, error } = await supabase
    .from('plan_days')
    .select('id, day_index, created_at')
    .eq('plan_id', planId)
    .order('created_at');
  if(error){console.error('fetch error', error);return;}
  // pass1
  for(let i=0;i<days.length;i++){
    const tempIndex = 100 + i + 1;
    const { error: upd } = await supabase
      .from('plan_days')
      .update({ day_index: tempIndex })
      .eq('id', days[i].id);
    if(upd){console.error('pass1 error', upd);return;}
  }
  // pass2
  const { data: tempDays, error: tempErr } = await supabase
    .from('plan_days')
    .select('id, day_index')
    .eq('plan_id', planId)
    .order('day_index');
  if(tempErr){console.error(tempErr);return;}
  for(let i=0;i<tempDays.length;i++){
    const newIndex = i + 1;
    const { error: upd } = await supabase
      .from('plan_days')
      .update({ day_index: newIndex, label: `Day ${newIndex}` })
      .eq('id', tempDays[i].id);
    if(upd){console.error('pass2 error', upd);return;}
  }
  console.log('normalized day indexes');
}
run();
