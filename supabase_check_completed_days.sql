-- Check if completed_days table exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'completed_days'
ORDER BY ordinal_position;

-- If it doesn't exist, here's the SQL to create it:
/*
CREATE TABLE IF NOT EXISTS completed_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE CASCADE,
  day_index INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'skipped')),
  total_exercises INTEGER DEFAULT 0,
  total_weight_kg NUMERIC DEFAULT 0,
  total_duration_min NUMERIC DEFAULT 0,
  total_distance_km NUMERIC DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(client_id, plan_id, day_index)
);

-- Grant access
GRANT ALL ON completed_days TO anon, authenticated;

-- Disable RLS for now (or create appropriate policies)
ALTER TABLE completed_days DISABLE ROW LEVEL SECURITY;
*/

