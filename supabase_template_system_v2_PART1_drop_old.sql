-- =====================================================
-- TEMPLATE SYSTEM V2 - PART 1: DROP OLD TABLES
-- =====================================================
-- This script removes the old template system completely
-- Safe to run since no one is using it yet

-- Drop old template tables in correct order (foreign keys first)
DROP TABLE IF EXISTS public.template_rules CASCADE;
DROP TABLE IF EXISTS public.template_split_logic CASCADE;
DROP TABLE IF EXISTS public.template_workout_structures CASCADE;
DROP TABLE IF EXISTS public.template_movement_requirements CASCADE;
DROP TABLE IF EXISTS public.client_preferences CASCADE;
DROP TABLE IF EXISTS public.plan_templates CASCADE;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Old template tables dropped successfully';
  RAISE NOTICE '📋 Ready for new template system';
END $$;

