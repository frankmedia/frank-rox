-- Fix Glute Bridge to be a bodyweight exercise instead of weights
-- This ensures it displays with duration/reps instead of weight/kg

UPDATE exercises
SET type = 'bodyweight'
WHERE name ILIKE '%Glute Bridge%'
  AND type = 'weights';

-- Verify the change
SELECT id, name, type, tags
FROM exercises
WHERE name ILIKE '%Glute Bridge%';

