-- Fix RLS policy for exercises table
-- Allow authenticated users to READ exercises

-- First, check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'exercises';

-- Enable RLS if not already enabled
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to read exercises" ON exercises;
DROP POLICY IF EXISTS "Public read access to exercises" ON exercises;

-- Create policy: Allow authenticated users to read all exercises
CREATE POLICY "Allow authenticated users to read exercises"
ON exercises
FOR SELECT
TO authenticated
USING (true);

-- Optional: Also allow public (non-authenticated) read access
-- Uncomment if you want exercises visible to everyone
-- CREATE POLICY "Public read access to exercises"
-- ON exercises
-- FOR SELECT
-- TO anon
-- USING (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'exercises';
