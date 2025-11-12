-- Test script to verify exercises RLS policies and authentication

-- 1. Check current user authentication
SELECT 
  current_user,
  session_user,
  (SELECT auth.uid()) as auth_uid;

-- 2. Check all policies on exercises table
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

-- 3. Try to verify RLS is enabled
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'exercises';

-- 4. Test if we can read an exercise (should work)
SELECT id, name, modality 
FROM exercises 
LIMIT 1;

-- 5. Check if there are any column-level security policies
SELECT 
  schemaname,
  tablename,
  column_name,
  policy_name
FROM information_schema.column_privileges
WHERE table_name = 'exercises'
AND grantee = 'authenticated';

