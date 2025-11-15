require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const clientId = 4;
  const { data: plans } = await supabase
    .from('plans')
    .select('id, name, status, created_at')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false })
    .limit(1);
  if (!plans?.length) {
    console.log('No plans');
    return;
  }
  const plan = plans[0];
  console.log('Plan:', plan);
  const { data: days } = await supabase
    .from('plan_days')
    .select('id, day_index, label, is_rest')
    .eq('plan_id', plan.id)
    .order('day_index');
  console.log('Days:', days);
  const { count: sessionCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('plan_id', plan.id);
  console.log('Session count:', sessionCount);
}

run().then(()=>process.exit(0));
