-- Create Frank's client record if it doesn't exist
-- First, check what clientId is in localStorage (check browser console)
-- Then update the id value below to match

INSERT INTO clients (id, name, email, password)
VALUES (
  25, -- UPDATE THIS with the actual clientId from localStorage
  'frank',
  'frank@example.com',
  'your_password_here'
)
ON CONFLICT (id) DO NOTHING;

-- Verify it was created
SELECT id, name, email, created_at FROM clients WHERE id = 25;

