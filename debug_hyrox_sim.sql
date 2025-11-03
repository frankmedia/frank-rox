-- Check the Hyrox Simulation block structure
SELECT 
  s.id as session_id,
  s.name as session_name,
  s.plan_day_id,
  sb.id as block_id,
  sb.block_type,
  sb.title as block_title,
  sb.parameters,
  COUNT(sbi.id) as item_count
FROM sessions s
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE s.name ILIKE '%Hyrox%' OR sb.title ILIKE '%Hyrox%'
GROUP BY s.id, s.name, s.plan_day_id, sb.id, sb.block_type, sb.title, sb.parameters
ORDER BY s.id DESC, sb.id
LIMIT 20;

-- Check individual items
SELECT 
  sbi.id,
  sbi.block_id,
  sbi.item_order,
  e.name as exercise_name,
  e.modality,
  sbi.extra
FROM session_block_items sbi
JOIN exercises e ON e.id = sbi.exercise_id
WHERE sbi.block_id IN (
  SELECT sb.id 
  FROM session_blocks sb 
  WHERE sb.title ILIKE '%Hyrox%' OR sb.block_type = 'simulation'
)
ORDER BY sbi.block_id, sbi.item_order
LIMIT 20;

