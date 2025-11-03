-- ✅ CHECK NEW HYROX SIMULATION BLOCK
-- Run this AFTER dragging "Hyrox Sim" button to verify everything is correct

-- 1. Check session/block structure
SELECT 
  s.id as session_id,
  s.name,
  pd.day_index,
  sb.id as block_id,
  sb.block_type,
  sb.title,
  sb.parameters,
  COUNT(sbi.id) as item_count
FROM sessions s
JOIN plan_days pd ON pd.id = s.plan_day_id
JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE s.name = 'Hyrox Simulation (Open Men)'
  AND sb.block_type = 'simulation'
GROUP BY s.id, s.name, pd.day_index, sb.id, sb.block_type, sb.title, sb.parameters;
-- Expected: item_count = 16, block_type = 'simulation', parameters has format: 'hyrox-sim'

-- 2. Check ALL 16 items with their data
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

-- ✅ WHAT TO CHECK:
-- - Item 0, 2, 4, 6, 8, 10, 12, 14: "1km Run" with distance: 1
-- - Item 1: SkiErg with distance: 1
-- - Item 3: Sled Push with weight: "152kg", distance: 0.05 (50m)
-- - Item 5: Sled Pull with weight: "103kg", distance: 0.05 (50m)
-- - Item 7: Burpee Broad Jump with distance: 0.08 (80m)
-- - Item 9: RowErg with distance: 1
-- - Item 11: Farmer Carry with weight: "2x24kg", distance: 0.2 (200m)
-- - Item 13: Sandbag Lunges with weight: "20kg", distance: 0.08 (80m)
-- - Item 15: Wall Balls with reps: 100, sets: 1, weight: "6kg"

