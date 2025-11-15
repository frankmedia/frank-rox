require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run(){
  const planId='f98e87ba-69dc-4c55-b3f4-326b6b0fcfe6';
  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id,name,plan_day_id');
  if(error) { console.error(error); return; }
  console.log(sessions?.filter(s=>s.plan_day_id).length, 'sessions');
}
run();
