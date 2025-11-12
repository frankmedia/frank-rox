-- ============================================
-- ADD CASCADE DELETE RULES
-- ============================================
-- This migration adds ON DELETE CASCADE to all foreign keys
-- so that deleting a client automatically deletes all associated data
-- ============================================

-- ============================================
-- 1. PLANS TABLE
-- ============================================
-- Drop existing foreign key constraint and recreate with CASCADE
ALTER TABLE plans 
DROP CONSTRAINT IF EXISTS plans_client_id_fkey;

ALTER TABLE plans
ADD CONSTRAINT plans_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;

-- ============================================
-- 2. PLAN_DAYS TABLE
-- ============================================
ALTER TABLE plan_days 
DROP CONSTRAINT IF EXISTS plan_days_plan_id_fkey;

ALTER TABLE plan_days
ADD CONSTRAINT plan_days_plan_id_fkey 
FOREIGN KEY (plan_id) 
REFERENCES plans(id) 
ON DELETE CASCADE;

-- ============================================
-- 3. SESSIONS TABLE
-- ============================================
ALTER TABLE sessions 
DROP CONSTRAINT IF EXISTS sessions_plan_day_id_fkey;

ALTER TABLE sessions
ADD CONSTRAINT sessions_plan_day_id_fkey 
FOREIGN KEY (plan_day_id) 
REFERENCES plan_days(id) 
ON DELETE CASCADE;

-- ============================================
-- 4. SESSION_BLOCKS TABLE
-- ============================================
ALTER TABLE session_blocks 
DROP CONSTRAINT IF EXISTS session_blocks_session_id_fkey;

ALTER TABLE session_blocks
ADD CONSTRAINT session_blocks_session_id_fkey 
FOREIGN KEY (session_id) 
REFERENCES sessions(id) 
ON DELETE CASCADE;

-- ============================================
-- 5. SESSION_BLOCK_ITEMS TABLE
-- ============================================
ALTER TABLE session_block_items 
DROP CONSTRAINT IF EXISTS session_block_items_block_id_fkey;

ALTER TABLE session_block_items
ADD CONSTRAINT session_block_items_block_id_fkey 
FOREIGN KEY (block_id) 
REFERENCES session_blocks(id) 
ON DELETE CASCADE;

-- ============================================
-- 6. WORKOUT_LOGS TABLE
-- ============================================
ALTER TABLE workout_logs 
DROP CONSTRAINT IF EXISTS workout_logs_client_id_fkey;

ALTER TABLE workout_logs
ADD CONSTRAINT workout_logs_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;

-- ============================================
-- 7. COMPLETED_DAYS TABLE
-- ============================================
ALTER TABLE completed_days 
DROP CONSTRAINT IF EXISTS completed_days_client_id_fkey;

ALTER TABLE completed_days
ADD CONSTRAINT completed_days_client_id_fkey 
FOREIGN KEY (client_id) 
REFERENCES clients(id) 
ON DELETE CASCADE;

ALTER TABLE completed_days 
DROP CONSTRAINT IF EXISTS completed_days_plan_id_fkey;

ALTER TABLE completed_days
ADD CONSTRAINT completed_days_plan_id_fkey 
FOREIGN KEY (plan_id) 
REFERENCES plans(id) 
ON DELETE CASCADE;

-- ============================================
-- VERIFY CASCADE RULES
-- ============================================
-- Check all foreign keys now have CASCADE
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('plans', 'plan_days', 'sessions', 'session_blocks', 'session_block_items', 'workout_logs', 'completed_days')
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- NOTES
-- ============================================
-- After running this migration:
-- 1. Deleting a CLIENT will automatically delete:
--    - All their PLANS
--    - All PLAN_DAYS for those plans
--    - All SESSIONS for those plan_days
--    - All SESSION_BLOCKS for those sessions
--    - All SESSION_BLOCK_ITEMS for those blocks
--    - All WORKOUT_LOGS for that client
--    - All COMPLETED_DAYS for that client
--
-- 2. Deleting a PLAN will automatically delete:
--    - All PLAN_DAYS
--    - All SESSIONS
--    - All SESSION_BLOCKS
--    - All SESSION_BLOCK_ITEMS
--    - All COMPLETED_DAYS for that plan
--
-- 3. This makes data cleanup automatic and prevents orphaned records
-- ============================================

