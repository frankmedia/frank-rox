-- Fix Matt's circuit - remove bad distance/duration data and fix item order

-- First, identify which circuit has these 4 exercises
SELECT 
  sb.id as block_id,
  sb.title,
  sb.work_sec,
  sb.rest_sec,
  COUNT(sbi.id) as exercise_count
FROM session_blocks sb
JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE sb.id IN ('57e1ba51-dde6-484b-b344-e860a86a6d7c', 'b6603677-dc4b-47ee-9e85-495de1d31089')
GROUP BY sb.id, sb.title, sb.work_sec, sb.rest_sec;

-- Clean up the exercise data - remove distance and duration fields
-- These are TIMED circuit exercises - they just need the name!
UPDATE session_block_items sbi
SET extra = jsonb_build_object(
  'intensity', sbi.extra->'intensity'
)
WHERE sbi.block_id IN (
  SELECT id FROM session_blocks 
  WHERE id IN ('57e1ba51-dde6-484b-b344-e860a86a6d7c', 'b6603677-dc4b-47ee-9e85-495de1d31089')
);

-- Fix the item_order for the circuit with rest_sec = 0 (the correct one)
WITH ordered_items AS (
  SELECT 
    sbi.id,
    ROW_NUMBER() OVER (ORDER BY e.name) - 1 as new_order
  FROM session_block_items sbi
  JOIN exercises e ON e.id = sbi.exercise_id
  JOIN session_blocks sb ON sb.id = sbi.block_id
  WHERE sb.id = 'b6603677-dc4b-47ee-9e85-495de1d31089'
)
UPDATE session_block_items sbi
SET item_order = oi.new_order
FROM ordered_items oi
WHERE sbi.id = oi.id;

-- Delete the WRONG circuit (the one with rest_sec = 30)
DELETE FROM session_block_items WHERE block_id = '57e1ba51-dde6-484b-b344-e860a86a6d7c';
DELETE FROM session_blocks WHERE id = '57e1ba51-dde6-484b-b344-e860a86a6d7c';

-- Verify the fix
SELECT 
  e.name,
  sbi.item_order,
  sbi.extra,
  sb.work_sec,
  sb.rest_sec,
  sb.rounds,
  sb.rest_between_rounds_s
FROM session_block_items sbi
JOIN exercises e ON e.id = sbi.exercise_id
JOIN session_blocks sb ON sb.id = sbi.block_id
WHERE sb.id = 'b6603677-dc4b-47ee-9e85-495de1d31089'
ORDER BY sbi.item_order;

