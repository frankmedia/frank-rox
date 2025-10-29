-- ============================================
-- CHECK MATT'S SETUP IN SUPABASE
-- ============================================

-- 1. Check if Matt exists as a client
SELECT id, name, email 
FROM clients 
WHERE name ILIKE '%matt%';

-- 2. Check if Matt has any active plans
SELECT p.id, p.name, p.status, p.created_at
FROM plans p
JOIN clients c ON p.client_id = c.id
WHERE c.name ILIKE '%matt%';

-- 3. Count plan days for Matt's plan (if exists)
SELECT p.name as plan_name, COUNT(pd.id) as total_days
FROM plans p
LEFT JOIN plan_days pd ON p.id = pd.plan_id
JOIN clients c ON p.client_id = c.id
WHERE c.name ILIKE '%matt%'
GROUP BY p.id, p.name;

-- 4. Check exercises for a specific day (change day_index as needed)
SELECT 
    pd.day_index,
    pd.is_rest,
    s.name as session_name,
    sb.title as block_title,
    sb.block_type,
    e.name as exercise_name,
    e.modality as exercise_type,
    sbi.extra as exercise_details,
    sbi.item_order
FROM plan_days pd
LEFT JOIN sessions s ON s.plan_day_id = pd.id
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
LEFT JOIN exercises e ON sbi.exercise_id = e.id
WHERE pd.plan_id = (
    SELECT p.id FROM plans p 
    JOIN clients c ON p.client_id = c.id 
    WHERE c.name ILIKE '%matt%' 
    LIMIT 1
)
AND pd.day_index = 0  -- Change to 1, 2, 3, etc. for other days
ORDER BY s.order_index, sb.order_index, sbi.item_order;

-- 5. Get overview of all days in Matt's plan
SELECT 
    pd.day_index + 1 as day_number,
    pd.is_rest,
    COUNT(DISTINCT s.id) as num_sessions,
    COUNT(DISTINCT sb.id) as num_blocks,
    COUNT(DISTINCT sbi.id) as num_items,
    STRING_AGG(DISTINCT sb.block_type, ', ') as block_types
FROM plan_days pd
LEFT JOIN sessions s ON s.plan_day_id = pd.id
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE pd.plan_id = (
    SELECT p.id FROM plans p 
    JOIN clients c ON p.client_id = c.id 
    WHERE c.name ILIKE '%matt%' 
    LIMIT 1
)
GROUP BY pd.day_index, pd.is_rest
ORDER BY pd.day_index;

