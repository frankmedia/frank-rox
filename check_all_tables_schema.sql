-- Check sessions table structure
SELECT 'sessions' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'sessions'
ORDER BY ordinal_position;

-- Check session_blocks table structure
SELECT 'session_blocks' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'session_blocks'
ORDER BY ordinal_position;

-- Check session_block_items table structure
SELECT 'session_block_items' as table_name, column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'session_block_items'
ORDER BY ordinal_position;

-- Or just get sample data from each
SELECT 'sessions' as table_name, * FROM sessions LIMIT 1;
SELECT 'session_blocks' as table_name, * FROM session_blocks LIMIT 1;
SELECT 'session_block_items' as table_name, * FROM session_block_items LIMIT 1;

