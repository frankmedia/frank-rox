require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function fixDayIndex() {
  const planId = 'cb1df46d-57f0-4c93-88b5-9b8575759be7';
  
  console.log('\n🔧 Fixing day_index to be 1-14...\n');
  
  // Get all days sorted by current day_index
  const { data: days } = await supabase
    .from('plan_days')
    .select('id, day_index, label')
    .eq('plan_id', planId)
    .order('day_index', { ascending: true });
  
  if (!days) {
    console.log('❌ No days found');
    return;
  }
  
  // Update each day to have day_index 1-14
  for (let i = 0; i < days.length; i++) {
    const newIndex = i + 1;
    const newLabel = `Day ${newIndex}`;
    
    await supabase
      .from('plan_days')
      .update({ 
        day_index: newIndex,
        label: newLabel
      })
      .eq('id', days[i].id);
    
    console.log(`✅ Updated: ${days[i].label} (was day_index ${days[i].day_index}) → ${newLabel} (day_index ${newIndex})`);
  }
  
  console.log('\n✅ All days fixed! Days are now 1-14.');
}

fixDayIndex().then(() => process.exit(0));
