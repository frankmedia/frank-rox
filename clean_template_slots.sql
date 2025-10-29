-- Remove template slots (empty exercises) from the HYROX plan
-- This will restore the normal "Drop exercises here" functionality

-- Delete all session_block_items where exercise_id is NULL
-- (these are the template slots)
DELETE FROM session_block_items
WHERE exercise_id IS NULL
AND extra->'template_requirement' IS NOT NULL;

-- Also clean up any empty sessions/blocks that might be left
DELETE FROM session_blocks sb
WHERE NOT EXISTS (
  SELECT 1 FROM session_block_items sbi
  WHERE sbi.block_id = sb.id
);

DELETE FROM sessions s
WHERE NOT EXISTS (
  SELECT 1 FROM session_blocks sb
  WHERE sb.session_id = s.id
);

-- Show remaining structure
SELECT 
  pd.day_index,
  pd.label,
  COUNT(sbi.id) as exercise_count
FROM plan_days pd
LEFT JOIN sessions s ON s.plan_day_id = pd.id
LEFT JOIN session_blocks sb ON sb.session_id = s.id  
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE pd.plan_id = 'c5c68bfa-4ab6-4792-ad8d-9b6dd7724199'
GROUP BY pd.day_index, pd.label, pd.id
ORDER BY pd.day_index
LIMIT 10;


