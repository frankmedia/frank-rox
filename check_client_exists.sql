-- Check if the client exists and get their details
SELECT 
  id,
  email,
  name,
  created_at,
  onboarding_completed_at
FROM clients
WHERE email ILIKE '%frank%'
ORDER BY created_at DESC;

-- Also check the auth.users table to see if there's a mismatch
-- Note: You may need to run this separately with appropriate permissions
-- SELECT id, email FROM auth.users WHERE email ILIKE '%frank%';

