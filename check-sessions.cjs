const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://wpmmetlzrjbqvgdxqxcq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwbW1ldGx6cmpicXZnZHhxeGNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA5NjI1MDIsImV4cCI6MjA3NjUzODUwMn0._LY444kBUTxCJD8zD7HplY1wGHtCUGRnvtxZ7YOrky8'
);

async function check() {
  const sessionIds = [
    'd27e3f5d-ff66-4f21-a916-12b63ad3de4b',
    '535a4f12-a35f-4028-9e8b-41a607e69bb3',
    '17d09308-9124-41c7-8df6-20ef1865d5c0'
  ];
  
  for (const id of sessionIds) {
    const { data: session } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (session) {
      console.log(`✅ Session ${id} EXISTS`);
    } else {
      console.log(`❌ Session ${id} NOT FOUND`);
    }
  }
}

check().then(() => process.exit(0)).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
