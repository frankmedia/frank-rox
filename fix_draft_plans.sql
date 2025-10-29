-- Fix existing draft plans for Natalie (or any client)
-- Update all draft plans to active status with current date

UPDATE public.plans
SET 
  status = 'active',
  start_date = COALESCE(start_date, NOW())
WHERE status = 'draft';

-- Check the result
SELECT 
  p.id,
  c.name as client_name,
  p.name as plan_name,
  p.status,
  p.start_date,
  p.cycle_days,
  p.current_day
FROM plans p
JOIN clients c ON c.id = p.client_id
ORDER BY c.name, p.start_date DESC;

