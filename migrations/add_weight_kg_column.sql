-- Add weight_kg column to session_block_items table
-- This column stores the prescribed weight in kilograms for each exercise

ALTER TABLE session_block_items 
ADD COLUMN IF NOT EXISTS weight_kg INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN session_block_items.weight_kg IS 'Prescribed weight in kilograms, calculated from user onboarding 5RM data';

-- Create index for faster queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_session_block_items_weight_kg 
ON session_block_items(weight_kg) 
WHERE weight_kg IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'session_block_items' 
AND column_name = 'weight_kg';

