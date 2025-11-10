-- Delete all active plans for testing
-- This will cascade delete plan_days, sessions, blocks, and items

DELETE FROM plans WHERE status = 'active';
