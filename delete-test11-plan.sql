-- Delete the broken plan for test11
-- The CASCADE rules will automatically delete all plan_days, sessions, blocks, and items

-- Find the user
SELECT id, name, email FROM clients WHERE name = 'test11' ORDER BY id DESC LIMIT 1;

-- Delete the active plan (this will cascade to all related data)
DELETE FROM plans 
WHERE client_id = (SELECT id FROM clients WHERE name = 'test11' ORDER BY id DESC LIMIT 1)
AND status = 'active';

-- Verify it's deleted
SELECT COUNT(*) as remaining_plans FROM plans 
WHERE client_id = (SELECT id FROM clients WHERE name = 'test11' ORDER BY id DESC LIMIT 1);


