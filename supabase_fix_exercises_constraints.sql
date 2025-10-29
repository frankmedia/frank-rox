-- Remove pattern constraints from exercises table
-- This allows free-form pattern values that can be updated gradually

-- Drop any existing pattern check constraints
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_pattern_check;
ALTER TABLE public.exercises DROP CONSTRAINT IF EXISTS exercises_movement_pattern_check;

-- Verify constraints are removed
SELECT 
  constraint_name, 
  constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'exercises' 
  AND constraint_type = 'CHECK';

