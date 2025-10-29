-- ============================================
-- VERIFY MATT'S PROGRAM WAS CREATED
-- ============================================

-- 1. Check Matt's plan exists
SELECT id, name, status, created_at 
FROM plans 
WHERE name LIKE '%Matt%'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Check all 14 days were created
SELECT 
    day_index + 1 as day_number,
    is_rest,
    CASE WHEN is_rest THEN 'REST DAY' ELSE 'Training Day' END as day_type
FROM plan_days 
WHERE plan_id = (
    SELECT id FROM plans WHERE name LIKE '%Matt%' ORDER BY created_at DESC LIMIT 1
)
ORDER BY day_index;

-- 3. Check sessions for each training day
SELECT 
    pd.day_index + 1 as day_number,
    s.name as session_name,
    COUNT(DISTINCT sb.id) as num_blocks,
    COUNT(DISTINCT sbi.id) as num_items
FROM plan_days pd
LEFT JOIN sessions s ON s.plan_day_id = pd.id
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE pd.plan_id = (
    SELECT id FROM plans WHERE name LIKE '%Matt%' ORDER BY created_at DESC LIMIT 1
)
GROUP BY pd.day_index, pd.is_rest, s.name
ORDER BY pd.day_index;

-- 4. Detailed view of Day 1 (Interval Run)
SELECT 
    sb.order_index as block_order,
    sb.block_type,
    sb.title as block_title,
    sb.rounds,
    e.name as exercise_name,
    sbi.item_order,
    sbi.extra
FROM plan_days pd
JOIN sessions s ON s.plan_day_id = pd.id
JOIN session_blocks sb ON sb.session_id = s.id
JOIN session_block_items sbi ON sbi.block_id = sb.id
JOIN exercises e ON sbi.exercise_id = e.id
WHERE pd.plan_id = (
    SELECT id FROM plans WHERE name LIKE '%Matt%' ORDER BY created_at DESC LIMIT 1
)
AND pd.day_index = 0  -- Day 1
ORDER BY sb.order_index, sbi.item_order;

-- 5. Summary stats
SELECT 
    COUNT(DISTINCT pd.id) as total_days,
    COUNT(DISTINCT pd.id) FILTER (WHERE pd.is_rest) as rest_days,
    COUNT(DISTINCT pd.id) FILTER (WHERE NOT pd.is_rest) as training_days,
    COUNT(DISTINCT s.id) as total_sessions,
    COUNT(DISTINCT sb.id) as total_blocks,
    COUNT(DISTINCT sbi.id) as total_items
FROM plan_days pd
LEFT JOIN sessions s ON s.plan_day_id = pd.id
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE pd.plan_id = (
    SELECT id FROM plans WHERE name LIKE '%Matt%' ORDER BY created_at DESC LIMIT 1
);

