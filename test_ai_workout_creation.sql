-- Test AI Workout Creation
-- Run this in Supabase SQL Editor to test if we can create sessions

-- 1. Check if the plan exists
SELECT id, client_id, name 
FROM plans 
WHERE id = '6e1d9d0d-3cbb-4b53-b128-a058c332ad2a';

-- 2. Try to insert a test session
INSERT INTO sessions (plan_id, name, order_index)
VALUES ('6e1d9d0d-3cbb-4b53-b128-a058c332ad2a', 'AI Test Session', 999)
RETURNING *;

-- 3. If successful, clean up
DELETE FROM sessions 
WHERE name = 'AI Test Session' AND order_index = 999;

