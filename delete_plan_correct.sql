-- Correct column names for deletion
-- session_block_items has "block_id" not "session_block_id"

DELETE FROM session_block_items WHERE block_id IN (
  SELECT sb.id FROM session_blocks sb
  JOIN sessions s ON sb.session_id = s.id
  JOIN plan_days pd ON s.plan_day_id = pd.id
  JOIN plans p ON pd.plan_id = p.id
  JOIN clients c ON p.client_id = c.id
  WHERE c.email = 'frank@roxpt.co.uk'
);

DELETE FROM session_blocks WHERE session_id IN (
  SELECT s.id FROM sessions s
  JOIN plan_days pd ON s.plan_day_id = pd.id
  JOIN plans p ON pd.plan_id = p.id
  JOIN clients c ON p.client_id = c.id
  WHERE c.email = 'frank@roxpt.co.uk'
);

DELETE FROM sessions WHERE plan_day_id IN (
  SELECT pd.id FROM plan_days pd
  JOIN plans p ON pd.plan_id = p.id
  JOIN clients c ON p.client_id = c.id
  WHERE c.email = 'frank@roxpt.co.uk'
);

DELETE FROM plan_days WHERE plan_id IN (
  SELECT p.id FROM plans p
  JOIN clients c ON p.client_id = c.id
  WHERE c.email = 'frank@roxpt.co.uk'
);

DELETE FROM plans WHERE client_id IN (
  SELECT id FROM clients WHERE email = 'frank@roxpt.co.uk'
);
