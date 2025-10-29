-- ============================================
-- FIX RLS POLICIES FOR CLIENT LOGIN
-- ============================================
-- Allow reading client credentials for authentication

-- Check current RLS status
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'clients';

-- Check existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'clients';

-- Option 1: Disable RLS temporarily (SIMPLE - for development/testing)
-- Uncomment this if you want to disable RLS completely:
-- ALTER TABLE clients DISABLE ROW LEVEL SECURITY;

-- Option 2: Create a policy to allow anonymous reads for authentication (RECOMMENDED)
-- This allows anyone to read clients table (needed for login)
-- But you should still protect writes with other policies

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Allow anonymous read for authentication" ON clients;

-- Create policy to allow reading clients (needed for login)
CREATE POLICY "Allow anonymous read for authentication" 
ON clients 
FOR SELECT 
USING (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'clients';

