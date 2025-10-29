-- Count exercises in Matt's circuit block

SELECT 
  sb.title,
  sb.id as block_id,
  COUNT(sbi.id) as actual_exercise_count,
  json_agg(json_build_object(
    'name', e.name,
    'order', sbi.item_order,
    'extra', sbi.extra
  ) ORDER BY sbi.item_order) as exercises
FROM session_blocks sb
JOIN session_block_items sbi ON sbi.block_id = sb.id
JOIN exercises e ON e.id = sbi.exercise_id
WHERE sb.id = 'b6603677-dc4b-47ee-9e85-495de1d31089'
GROUP BY sb.id, sb.title;

