-- Check what sessions and exercises exist for Day 1
-- This will show if the strength workout was actually created

-- Get all sessions for Day 1 of the most recent active plan
SELECT 
  s.id as session_id,
  s.name as session_name,
  s.order_index,
  COUNT(DISTINCT sb.id) as num_blocks,
  COUNT(DISTINCT sbi.id) as num_exercises,
  STRING_AGG(DISTINCT e.name, ', ') as exercise_names
FROM plans p
JOIN plan_days pd ON pd.plan_id = p.id
JOIN sessions s ON s.plan_day_id = pd.id
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
LEFT JOIN exercises e ON e.id = sbi.exercise_id
WHERE p.status = 'active'
  AND pd.day_index = 1
GROUP BY s.id, s.name, s.order_index
ORDER BY s.order_index;

