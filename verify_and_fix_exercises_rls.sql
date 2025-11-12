-- Verify and fix exercises RLS policies
-- This script will check current policies and recreate them with proper WITH CHECK clauses

-- Step 1: Check current policies
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'exercises'
ORDER BY cmd, policyname;

-- Step 2: Drop all existing UPDATE policies (they might be missing WITH CHECK)
DROP POLICY IF EXISTS "Allow authenticated users to update exercises" ON exercises;
DROP POLICY IF EXISTS "exercises_update_auth" ON exercises;

-- Step 3: Create a single, correct UPDATE policy with both USING and WITH CHECK
CREATE POLICY "exercises_update_auth"
ON exercises
FOR UPDATE
TO authenticated
USING (true)  -- Can update any row
WITH CHECK (true);  -- Can set any values

-- Step 4: Verify the new policy
SELECT 
  policyname,
  cmd,
  qual as using_clause,
  with_check
FROM pg_policies
WHERE tablename = 'exercises' AND cmd = 'UPDATE';

-- Step 5: Test the policy (this will show if you're authenticated)
-- Uncomment to test:
-- UPDATE exercises SET notes = 'test' WHERE id = 'd035abfc-002c-438d-933f-4c304accb805';

