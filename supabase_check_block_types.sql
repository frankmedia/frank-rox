-- Check what block_type values are actually valid
SELECT DISTINCT block_type, COUNT(*) as count
FROM session_blocks
WHERE block_type IS NOT NULL
GROUP BY block_type
ORDER BY count DESC;

-- Also check the constraint definition
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'session_blocks'::regclass
AND conname LIKE '%block_type%';

