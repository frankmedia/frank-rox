require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkDays() {
  const planId = 'cb1df46d-57f0-4c93-88b5-9b8575759be7';
  
  const { data: days } = await supabase
    .from('plan_days')
    .select('id, day_index, label')
    .eq('plan_id', planId)
    .order('day_index', { ascending: true });
  
  console.log('\n📅 Current day_index values:\n');
  days?.forEach((d, idx) => {
    console.log(`${idx + 1}. day_index: ${d.day_index}, label: "${d.label}"`);
  });
  
  // Check for sessions
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, name, plan_day_id')
    .in('plan_day_id', days?.map(d => d.id) || []);
  
  console.log(`\n📦 Total sessions: ${sessions?.length || 0}`);
}

checkDays().then(() => process.exit(0));
