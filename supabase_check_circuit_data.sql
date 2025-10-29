-- ============================================
-- CHECK CIRCUIT DATA FOR MATT'S DAY 1
-- ============================================

-- Get Matt's plan ID
WITH matt_plan AS (
    SELECT id FROM plans WHERE name LIKE '%Matt%' ORDER BY created_at DESC LIMIT 1
)
SELECT 
    pd.day_index + 1 as day_number,
    s.name as session_name,
    sb.id as block_id,
    sb.block_type,
    sb.title as block_title,
    sb.rounds,
    sb.time_cap_sec,
    e.name as exercise_name,
    sbi.item_order,
    sbi.extra
FROM plan_days pd
JOIN sessions s ON s.plan_day_id = pd.id
JOIN session_blocks sb ON sb.session_id = s.id
JOIN session_block_items sbi ON sbi.block_id = sb.id
JOIN exercises e ON sbi.exercise_id = e.id
WHERE pd.plan_id = (SELECT id FROM matt_plan)
AND pd.day_index = 0  -- Day 1
AND sb.block_type = 'circuit'
ORDER BY sb.order_index, sbi.item_order;

