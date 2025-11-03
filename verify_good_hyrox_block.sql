-- ✅ Verify the good Hyrox Simulation block exists and has proper data

-- 1. Check the session and block
SELECT 
  s.id as session_id,
  s.name,
  s.plan_day_id,
  pd.day_index,
  sb.id as block_id,
  sb.block_type,
  sb.title,
  sb.parameters,
  COUNT(sbi.id) as item_count
FROM sessions s
JOIN plan_days pd ON pd.id = s.plan_day_id
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE s.name = 'Hyrox Simulation (Open Men)'
  AND sb.block_type = 'simulation'
GROUP BY s.id, s.name, s.plan_day_id, pd.day_index, sb.id, sb.block_type, sb.title, sb.parameters;

-- 2. Check the items and their extra data
SELECT 
  sbi.item_order,
  e.name as exercise_name,
  e.modality,
  sbi.extra
FROM session_block_items sbi
JOIN exercises e ON e.id = sbi.exercise_id
WHERE sbi.block_id IN (
  SELECT sb.id 
  FROM session_blocks sb 
  JOIN sessions s ON s.id = sb.session_id
  WHERE s.name = 'Hyrox Simulation (Open Men)'
    AND sb.block_type = 'simulation'
)
ORDER BY sbi.item_order;

