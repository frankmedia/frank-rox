-- Find Frank's client record

-- Search by name
SELECT 
  id,
  name,
  email,
  created_at,
  onboarding_completed_at
FROM clients
WHERE name ILIKE '%frank%'
ORDER BY created_at DESC;

-- Get all clients (if needed)
SELECT 
  id,
  name,
  email,
  created_at
FROM clients
ORDER BY created_at DESC
LIMIT 10;
