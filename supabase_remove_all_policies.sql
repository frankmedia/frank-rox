-- ============================================
-- REMOVE ALL RLS POLICIES AND DISABLE RLS
-- ============================================

-- First, show all existing policies
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive,
    roles,
    cmd as command
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Drop ALL policies on clients table
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'clients'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON clients', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- Disable RLS on clients table
ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Verify no policies remain and RLS is disabled
SELECT 
    tablename,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'clients') as policy_count,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'clients';

-- Also check if there are any table grants issues
SELECT 
    grantee, 
    table_name, 
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
AND table_name = 'clients'
AND grantee IN ('anon', 'authenticated', 'public');

