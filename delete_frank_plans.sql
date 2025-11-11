-- Delete all plans and associated data for Frank
-- This will clean up all the old duplicate sessions

-- Step 1: Find Frank's client_id
-- (Replace 'frank@example.com' with your actual email if different)
WITH frank_client AS (
  SELECT id as client_id
  FROM clients
  WHERE email ILIKE '%frank%'
  LIMIT 1
)

-- Step 2: Delete all session_block_items (exercises)
DELETE FROM session_block_items
WHERE block_id IN (
  SELECT sb.id
  FROM session_blocks sb
  JOIN sessions s ON s.id = sb.session_id
  JOIN plan_days pd ON pd.id = s.plan_day_id
  JOIN plans p ON p.id = pd.plan_id
  WHERE p.client_id = (SELECT client_id FROM frank_client)
);

-- Step 3: Delete all session_blocks (workout blocks)
DELETE FROM session_blocks
WHERE session_id IN (
  SELECT s.id
  FROM sessions s
  JOIN plan_days pd ON pd.id = s.plan_day_id
  JOIN plans p ON p.id = pd.plan_id
  WHERE p.client_id = (SELECT client_id FROM frank_client)
);

-- Step 4: Delete all sessions
DELETE FROM sessions
WHERE plan_day_id IN (
  SELECT pd.id
  FROM plan_days pd
  JOIN plans p ON p.id = pd.plan_id
  WHERE p.client_id = (SELECT client_id FROM frank_client)
);

-- Step 5: Delete all plan_days
DELETE FROM plan_days
WHERE plan_id IN (
  SELECT id
  FROM plans
  WHERE client_id = (SELECT client_id FROM frank_client)
);

-- Step 6: Delete all plans
DELETE FROM plans
WHERE client_id = (SELECT client_id FROM frank_client);

-- Verify deletion
SELECT 
  'Plans deleted' as status,
  COUNT(*) as remaining_plans
FROM plans
WHERE client_id = (SELECT id FROM clients WHERE email ILIKE '%frank%' LIMIT 1);

