-- Fix exercises with unreasonable distance values
-- Distance should be in kilometers, reasonable range: 0.01km (10m) to 100km
-- Anything outside this range is likely corrupt/default data

-- First, let's check what bad data we have (checking BOTH 'distance' and 'distance_km' fields)
SELECT 
  sbi.id,
  e.name as exercise_name,
  e.modality,
  sbi.extra->>'distance' as bad_distance,
  sbi.extra->>'distance_km' as bad_distance_km,
  sb.title as block_title
FROM session_block_items sbi
JOIN exercises e ON e.id = sbi.exercise_id
JOIN session_blocks sb ON sb.id = sbi.block_id
WHERE (
    (sbi.extra->>'distance' IS NOT NULL 
      AND ((sbi.extra->>'distance')::numeric < 0.01 OR (sbi.extra->>'distance')::numeric > 100))
    OR
    (sbi.extra->>'distance_km' IS NOT NULL 
      AND ((sbi.extra->>'distance_km')::numeric < 0.01 OR (sbi.extra->>'distance_km')::numeric > 100))
  )
ORDER BY GREATEST(
  COALESCE((sbi.extra->>'distance')::numeric, 0),
  COALESCE((sbi.extra->>'distance_km')::numeric, 0)
) DESC;

-- Fix the bad data by removing BOTH 'distance' and 'distance_km' fields
UPDATE session_block_items sbi
SET extra = sbi.extra - 'distance' - 'distance_km'
WHERE (
    (sbi.extra->>'distance' IS NOT NULL 
      AND ((sbi.extra->>'distance')::numeric < 0.01 OR (sbi.extra->>'distance')::numeric > 100))
    OR
    (sbi.extra->>'distance_km' IS NOT NULL 
      AND ((sbi.extra->>'distance_km')::numeric < 0.01 OR (sbi.extra->>'distance_km')::numeric > 100))
  );

-- Check for exercises table bad data
SELECT 
  id,
  name,
  modality,
  media->>'target_distance_km' as bad_distance
FROM exercises
WHERE media->>'target_distance_km' IS NOT NULL
  AND ((media->>'target_distance_km')::numeric < 0.01 OR (media->>'target_distance_km')::numeric > 100);

-- Clean up exercises table if needed (remove bad distance data)
UPDATE exercises
SET media = media - 'target_distance_km'
WHERE media->>'target_distance_km' IS NOT NULL
  AND ((media->>'target_distance_km')::numeric < 0.01 OR (media->>'target_distance_km')::numeric > 100);

-- Verification query
SELECT 
  'session_block_items' as table_name,
  COUNT(*) as fixed_count
FROM session_block_items
WHERE (extra->>'distance_km')::numeric IS NULL
UNION ALL
SELECT 
  'exercises' as table_name,
  COUNT(*) as fixed_count
FROM exercises
WHERE (media->>'target_distance_km')::numeric IS NULL;

