-- Check if simulation blocks exist in the database

-- Check all blocks and their types
SELECT 
    sb.id,
    sb.block_type,
    sb.title,
    sb.rounds,
    sb.parameters,
    s.plan_day_id,
    COUNT(sbi.id) as item_count
FROM session_blocks sb
LEFT JOIN sessions s ON s.id = sb.session_id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
GROUP BY sb.id, sb.block_type, sb.title, sb.rounds, sb.parameters, s.plan_day_id
ORDER BY sb.created_at DESC
LIMIT 20;

-- Check specifically for simulation blocks
SELECT 
    sb.*,
    s.plan_day_id,
    COUNT(sbi.id) as exercise_count
FROM session_blocks sb
LEFT JOIN sessions s ON s.id = sb.session_id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE sb.block_type = 'simulation'
GROUP BY sb.id, s.plan_day_id
ORDER BY sb.created_at DESC;

