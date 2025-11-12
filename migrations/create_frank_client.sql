-- Create Frank's client record
-- This allows login with username: frank, password: frank123

INSERT INTO clients (name, email, password, created_at, updated_at)
VALUES (
  'frank',
  'frank@roxpt.app',
  'frank123',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET 
  password = 'frank123',
  updated_at = NOW();

-- Verify it was created
SELECT id, name, email, created_at FROM clients WHERE name = 'frank';


