-- Fix Glute Bridge to be a bodyweight exercise instead of weights
-- This ensures it displays with duration/reps instead of weight/kg
-- Note: exercises table uses 'modality' not 'type'

UPDATE exercises
SET modality = 'bodyweight'
WHERE name ILIKE '%Glute Bridge%'
  AND modality = 'weights';

-- Verify the change
SELECT id, name, modality, tags
FROM exercises
WHERE name ILIKE '%Glute Bridge%';

