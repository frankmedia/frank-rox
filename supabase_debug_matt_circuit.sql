-- Debug Matt's circuit data - what's ACTUALLY in the database

-- Find Matt's circuit block
SELECT 
  p.name as plan_name,
  pd.day_index,
  s.name as session_name,
  sb.id as block_id,
  sb.block_type,
  sb.title as block_title,
  sb.work_sec,
  sb.rest_sec,
  sb.rounds,
  sb.rest_between_rounds_s,
  sb.order_index
FROM plans p
JOIN plan_days pd ON pd.plan_id = p.id
JOIN sessions s ON s.plan_day_id = pd.id
JOIN session_blocks sb ON sb.session_id = s.id
JOIN clients c ON c.id = p.client_id
WHERE LOWER(c.name) = 'matt'
  AND sb.block_type = 'circuit'
ORDER BY pd.day_index, s.order_index, sb.order_index;

-- Show exercises in Matt's circuit with their actual data
SELECT 
  sb.title as block_title,
  sb.work_sec,
  sb.rest_sec,
  e.name as exercise_name,
  e.modality,
  sbi.item_order,
  sbi.extra as exercise_data,
  sbi.extra->>'sets' as sets,
  sbi.extra->>'reps' as reps,
  sbi.extra->>'weight' as weight,
  sbi.extra->>'duration' as duration,
  sbi.extra->>'distance_km' as distance_km
FROM plans p
JOIN plan_days pd ON pd.plan_id = p.id
JOIN sessions s ON s.plan_day_id = pd.id
JOIN session_blocks sb ON sb.session_id = s.id
JOIN session_block_items sbi ON sbi.block_id = sb.id
JOIN exercises e ON e.id = sbi.exercise_id
JOIN clients c ON c.id = p.client_id
WHERE LOWER(c.name) = 'matt'
  AND sb.block_type = 'circuit'
  AND pd.day_index = 1
ORDER BY sbi.item_order;

-- Count exercises in the circuit
SELECT 
  sb.title,
  COUNT(sbi.id) as exercise_count
FROM plans p
JOIN plan_days pd ON pd.plan_id = p.id
JOIN sessions s ON s.plan_day_id = pd.id
JOIN session_blocks sb ON sb.session_id = s.id
JOIN session_block_items sbi ON sbi.block_id = sb.id
JOIN clients c ON c.id = p.client_id
WHERE LOWER(c.name) = 'matt'
  AND sb.block_type = 'circuit'
  AND pd.day_index = 1
GROUP BY sb.id, sb.title;

