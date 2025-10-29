-- ============================================
-- DISABLE RLS ON ALL TABLES (DEVELOPMENT ONLY)
-- ============================================

-- Disable RLS on all main tables
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE plans DISABLE ROW LEVEL SECURITY;
ALTER TABLE plan_days DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_blocks DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_block_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE exercises DISABLE ROW LEVEL SECURITY;
ALTER TABLE workout_logs DISABLE ROW LEVEL SECURITY;

-- Verify all are disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('clients', 'plans', 'plan_days', 'sessions', 'session_blocks', 'session_block_items', 'exercises', 'workout_logs')
ORDER BY tablename;

