-- Delete the current active plan for Frank (clientId 25)
-- This will allow you to generate a fresh plan with all the fixes

-- Step 1: Get the plan ID
SELECT id, name, created_at 
FROM plans 
WHERE client_id = 25 AND status = 'active'
ORDER BY created_at DESC;

-- Step 2: Delete all associated data (uncomment to execute)
-- Replace PLAN_ID_HERE with the actual plan ID from step 1

/*
-- Delete session block items
DELETE FROM session_block_items
WHERE block_id IN (
  SELECT sb.id FROM session_blocks sb
  JOIN sessions s ON s.id = sb.session_id
  JOIN plan_days pd ON pd.id = s.plan_day_id
  WHERE pd.plan_id = PLAN_ID_HERE
);

-- Delete session blocks
DELETE FROM session_blocks
WHERE session_id IN (
  SELECT s.id FROM sessions s
  JOIN plan_days pd ON pd.id = s.plan_day_id
  WHERE pd.plan_id = PLAN_ID_HERE
);

-- Delete sessions
DELETE FROM sessions
WHERE plan_day_id IN (
  SELECT id FROM plan_days WHERE plan_id = PLAN_ID_HERE
);

-- Delete plan days
DELETE FROM plan_days WHERE plan_id = PLAN_ID_HERE;

-- Delete the plan
DELETE FROM plans WHERE id = PLAN_ID_HERE;

-- Verify deletion
SELECT COUNT(*) as remaining_plans FROM plans WHERE client_id = 25 AND status = 'active';
*/

