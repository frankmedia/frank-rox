-- Delete your existing plan so you can regenerate with the new weight prescription system
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard

-- Find your client_id first
SELECT id, name, email FROM clients WHERE email LIKE '%frank%' OR name LIKE '%frank%';

-- Then delete the plan (replace 19 with your actual client_id if different)
DELETE FROM plans WHERE client_id = 19;

-- Verify it's deleted
SELECT * FROM plans WHERE client_id = 19;
-- Should return 0 rows

-- Now you can navigate to http://localhost:8081/onboarding-complete
-- Click "Let's Go 🚀" to regenerate your programme with personalized weights!

