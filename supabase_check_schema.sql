-- Check session_block_items schema
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'session_block_items'
ORDER BY ordinal_position;

-- Check foreign keys on session_block_items
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'session_block_items';

-- Check what's actually in session_block_items for this circuit block
SELECT 
  sbi.id,
  sbi.block_id,
  sbi.exercise_id,
  sbi.item_order,
  sbi.extra,
  e.name as exercise_name
FROM session_block_items sbi
LEFT JOIN exercises e ON e.id = sbi.exercise_id
WHERE sbi.block_id = 'cc043fe8-6429-425e-a67e-18ca0e4bc1bc'
ORDER BY sbi.item_order;

