-- Delete Frank's (ID 27) current active plan

-- Delete all session_block_items
DELETE FROM session_block_items
WHERE block_id IN (
  SELECT sb.id FROM session_blocks sb
  JOIN sessions s ON s.id = sb.session_id
  JOIN plan_days pd ON pd.id = s.plan_day_id
  JOIN plans p ON p.id = pd.plan_id
  WHERE p.client_id = 27 AND p.status = 'active'
);

-- Delete all session_blocks
DELETE FROM session_blocks
WHERE session_id IN (
  SELECT s.id FROM sessions s
  JOIN plan_days pd ON pd.id = s.plan_day_id
  JOIN plans p ON p.id = pd.plan_id
  WHERE p.client_id = 27 AND p.status = 'active'
);

-- Delete all sessions
DELETE FROM sessions
WHERE plan_day_id IN (
  SELECT pd.id FROM plan_days pd
  JOIN plans p ON p.id = pd.plan_id
  WHERE p.client_id = 27 AND p.status = 'active'
);

-- Delete all plan_days
DELETE FROM plan_days
WHERE plan_id IN (
  SELECT id FROM plans WHERE client_id = 27 AND status = 'active'
);

-- Delete the plan itself
DELETE FROM plans WHERE client_id = 27 AND status = 'active';

-- Verify deletion
SELECT 
  'Plan deleted successfully' as status,
  COUNT(*) as remaining_active_plans
FROM plans
WHERE client_id = 27 AND status = 'active';
