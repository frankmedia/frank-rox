-- Complete fix for exercises RLS policies
-- This will clean up duplicates and ensure all policies have proper WITH CHECK clauses

-- Enable RLS if not already enabled
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Allow authenticated users to read exercises" ON exercises;
DROP POLICY IF EXISTS "Allow authenticated users to update exercises" ON exercises;
DROP POLICY IF EXISTS "Allow authenticated users to insert exercises" ON exercises;
DROP POLICY IF EXISTS "Allow authenticated users to delete exercises" ON exercises;
DROP POLICY IF EXISTS "exercises_select_auth" ON exercises;
DROP POLICY IF EXISTS "exercises_update_auth" ON exercises;
DROP POLICY IF EXISTS "exercises_insert_auth" ON exercises;
DROP POLICY IF EXISTS "exercises_delete_auth" ON exercises;
DROP POLICY IF EXISTS "anon read exercises" ON exercises;

-- Create clean policies with proper WITH CHECK clauses

-- SELECT: Allow authenticated users to read all exercises
CREATE POLICY "exercises_select_auth"
ON exercises
FOR SELECT
TO authenticated
USING (true);

-- SELECT: Allow anonymous users to read exercises (for public access)
CREATE POLICY "exercises_select_anon"
ON exercises
FOR SELECT
TO anon
USING (true);

-- UPDATE: Allow authenticated users to update all exercises
-- Both USING and WITH CHECK are required for UPDATE policies
CREATE POLICY "exercises_update_auth"
ON exercises
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- INSERT: Allow authenticated users to insert exercises
CREATE POLICY "exercises_insert_auth"
ON exercises
FOR INSERT
TO authenticated
WITH CHECK (true);

-- DELETE: Allow authenticated users to delete exercises
CREATE POLICY "exercises_delete_auth"
ON exercises
FOR DELETE
TO authenticated
USING (true);

-- Verify the policies were created correctly
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'exercises'
ORDER BY cmd, policyname;

