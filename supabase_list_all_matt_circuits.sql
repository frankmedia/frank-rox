-- List ALL circuits for Matt on Day 1 (day_index = 0)

SELECT 
  sb.id as block_id,
  sb.title,
  sb.work_sec,
  sb.rest_sec,
  sb.rounds,
  sb.rest_between_rounds_s,
  sb.order_index,
  COUNT(sbi.id) as exercise_count,
  json_agg(e.name ORDER BY sbi.item_order) as exercise_names
FROM plans p
JOIN plan_days pd ON pd.plan_id = p.id
JOIN sessions s ON s.plan_day_id = pd.id
JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
LEFT JOIN exercises e ON e.id = sbi.exercise_id
JOIN clients c ON c.id = p.client_id
WHERE LOWER(c.name) = 'matt'
  AND pd.day_index = 0
  AND sb.block_type = 'circuit'
GROUP BY sb.id, sb.title, sb.work_sec, sb.rest_sec, sb.rounds, sb.rest_between_rounds_s, sb.order_index
ORDER BY sb.order_index;

