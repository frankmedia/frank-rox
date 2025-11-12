-- Fix RLS policies for exercises table to allow UPDATE and INSERT
-- Allow authenticated users to UPDATE and INSERT exercises

-- Enable RLS if not already enabled
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to update exercises" ON exercises;
DROP POLICY IF EXISTS "Allow authenticated users to insert exercises" ON exercises;
DROP POLICY IF EXISTS "Allow authenticated users to delete exercises" ON exercises;

-- Create policy: Allow authenticated users to UPDATE all exercises
CREATE POLICY "Allow authenticated users to update exercises"
ON exercises
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Create policy: Allow authenticated users to INSERT exercises
CREATE POLICY "Allow authenticated users to insert exercises"
ON exercises
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy: Allow authenticated users to DELETE exercises
CREATE POLICY "Allow authenticated users to delete exercises"
ON exercises
FOR DELETE
TO authenticated
USING (true);

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'exercises'
ORDER BY cmd, policyname;

