-- Delete the current simulation block (it has wrong data)

-- First verify which one we're deleting:
SELECT 
  s.id as session_id,
  s.name,
  pd.day_index,
  sb.id as block_id
FROM sessions s
JOIN plan_days pd ON pd.id = s.plan_day_id
JOIN session_blocks sb ON sb.session_id = s.id
WHERE s.name = 'Hyrox Simulation (Open Men)'
  AND sb.block_type = 'simulation';

-- Delete it (uncomment after verifying):
/*
DELETE FROM session_block_items 
WHERE block_id IN (
  SELECT sb.id 
  FROM session_blocks sb 
  JOIN sessions s ON s.id = sb.session_id
  WHERE s.name = 'Hyrox Simulation (Open Men)'
    AND sb.block_type = 'simulation'
);

DELETE FROM session_blocks 
WHERE id IN (
  SELECT sb.id 
  FROM session_blocks sb 
  JOIN sessions s ON s.id = sb.session_id
  WHERE s.name = 'Hyrox Simulation (Open Men)'
    AND sb.block_type = 'simulation'
);

DELETE FROM sessions 
WHERE name = 'Hyrox Simulation (Open Men)';
*/

-- ✅ After deleting:
-- 1. Go to admin panel, the day should be empty
-- 2. Drag "Hyrox Sim" button to that day ONE TIME
-- 3. Check database again - all distances and weights should be correct!

