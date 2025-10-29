-- Fix or delete the second circuit (c3a9b9ce) with null rest_sec

-- Option 1: Fix the rest_sec to 0 (if you want to keep both circuits)
UPDATE session_blocks
SET rest_sec = 0
WHERE id = 'c3a9b9ce-d1c3-4777-b415-4d2eca51f2c0';

-- Verify both circuits now have proper settings
SELECT 
  sb.id as block_id,
  sb.title,
  sb.work_sec,
  sb.rest_sec,
  sb.rounds,
  sb.rest_between_rounds_s,
  sb.order_index,
  COUNT(sbi.id) as exercise_count
FROM session_blocks sb
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE sb.id IN ('b6603677-dc4b-47ee-9e85-495de1d31089', 'c3a9b9ce-d1c3-4777-b415-4d2eca51f2c0')
GROUP BY sb.id, sb.title, sb.work_sec, sb.rest_sec, sb.rounds, sb.rest_between_rounds_s, sb.order_index;

-- OR Option 2: Delete the second circuit entirely (if you only want one)
-- DELETE FROM session_block_items WHERE block_id = 'c3a9b9ce-d1c3-4777-b415-4d2eca51f2c0';
-- DELETE FROM session_blocks WHERE id = 'c3a9b9ce-d1c3-4777-b415-4d2eca51f2c0';

