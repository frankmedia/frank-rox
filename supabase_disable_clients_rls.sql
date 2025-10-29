-- ============================================
-- DISABLE RLS ON CLIENTS TABLE
-- ============================================
-- This allows the app to read/write to clients table for authentication

-- Disable Row Level Security on clients table
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'clients';

-- Expected result: rowsecurity = false

