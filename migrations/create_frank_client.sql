-- ============================================
-- CREATE FRANK CLIENT RECORD
-- ============================================
-- This migration creates a client record for Frank to enable:
-- 1. Login to the mobile app
-- 2. Workout logging to Supabase (not just localStorage)
-- 3. Personal Best (PB) tracking
-- 4. Cross-device workout history sync
-- 5. Program assignment and tracking
--
-- CREDENTIALS:
-- Username: frank
-- Password: frank123
-- ============================================

-- Create Frank's client record
INSERT INTO clients (name, email, password, created_at, updated_at)
VALUES (
  'frank',
  'frank@roxpt.app',
  'frank123',
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE 
SET 
  password = 'frank123',
  updated_at = NOW();

-- Verify it was created
SELECT id, name, email, created_at FROM clients WHERE name = 'frank';

-- ============================================
-- GRANT PERMISSIONS
-- ============================================
-- Ensure the anon role can read/write to necessary tables
-- (The app uses custom auth, not Supabase auth, so requests come as 'anon')

-- Clients table (already has permissions from previous migrations)
-- workout_logs table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workout_logs TO anon;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- plans table
GRANT SELECT ON TABLE public.plans TO anon;

-- plan_days table
GRANT SELECT ON TABLE public.plan_days TO anon;

-- sessions table
GRANT SELECT ON TABLE public.sessions TO anon;

-- session_blocks table
GRANT SELECT ON TABLE public.session_blocks TO anon;

-- session_block_items table
GRANT SELECT ON TABLE public.session_block_items TO anon;

-- exercises table (already has permissions)
-- completed_days table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.completed_days TO anon;

-- ============================================
-- NOTES
-- ============================================
-- After running this migration:
-- 1. Login to the mobile app with: frank / frank123
-- 2. Workouts will automatically sync to Supabase
-- 3. History page will show all logged workouts
-- 4. PBs will be tracked and displayed
-- 5. Programs can be assigned to this client
-- ============================================


