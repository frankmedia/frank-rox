-- Fix plans table status constraint
-- The existing constraint doesn't allow "draft", "active", "completed"

-- Drop the old constraint
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_status_check;

-- Add the new constraint with all three statuses
ALTER TABLE public.plans ADD CONSTRAINT plans_status_check 
  CHECK (status IN ('draft', 'active', 'completed'));

-- Verify
SELECT 
  constraint_name, 
  check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'plans_status_check';

