-- Add 'simulation' to the allowed block types in session_blocks table
-- This migration updates the check constraint to allow the new simulation type

-- STEP 1: Check what block types currently exist
SELECT DISTINCT block_type, COUNT(*) as count
FROM session_blocks
GROUP BY block_type
ORDER BY count DESC;

-- STEP 2: First, drop the existing constraint (without validation)
ALTER TABLE session_blocks 
DROP CONSTRAINT IF EXISTS session_blocks_block_type_check;

-- STEP 3: Add the new constraint with 'simulation' included
-- Include all possible types that might exist
ALTER TABLE session_blocks 
ADD CONSTRAINT session_blocks_block_type_check 
CHECK (block_type IN ('strength', 'cardio', 'intervals', 'circuit', 'amrap', 'simulation', 'hiit', 'mobility', 'rehab'));

-- STEP 4: Verify the constraint was added
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'session_blocks'::regclass
AND conname = 'session_blocks_block_type_check';

