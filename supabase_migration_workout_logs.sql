-- Migration: Workout Logs and Day Completion Tracking
-- Description: Tables for storing workout history and tracking completed/skipped training days

-- ============================================
-- 1. WORKOUT LOGS TABLE
-- ============================================
-- Stores individual exercise logs from workouts
CREATE TABLE IF NOT EXISTS public.workout_logs (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  training_day INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  logged_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Weight-based exercises
  weight DECIMAL(6,2),
  weights DECIMAL(6,2)[],
  sets INTEGER,
  reps INTEGER,
  
  -- Cardio/running exercises
  duration_min INTEGER,
  distance_km DECIMAL(6,2),
  
  -- Additional data
  notes TEXT,
  rating INTEGER CHECK (rating >= 0 AND rating <= 5),
  is_pb BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS workout_logs_client_id_idx ON public.workout_logs(client_id);
CREATE INDEX IF NOT EXISTS workout_logs_logged_at_idx ON public.workout_logs(logged_at DESC);
CREATE INDEX IF NOT EXISTS workout_logs_training_day_idx ON public.workout_logs(training_day);
CREATE INDEX IF NOT EXISTS workout_logs_exercise_name_idx ON public.workout_logs(exercise_name);

-- ============================================
-- 2. COMPLETED DAYS TABLE
-- ============================================
-- Tracks which training days have been completed or skipped
CREATE TABLE IF NOT EXISTS public.completed_days (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  day_index INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('completed', 'skipped')),
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Stats for the day
  total_exercises INTEGER DEFAULT 0,
  total_weight_kg DECIMAL(10,2) DEFAULT 0,
  total_duration_min INTEGER DEFAULT 0,
  total_distance_km DECIMAL(6,2) DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Prevent duplicate day completions
  UNIQUE(client_id, plan_id, day_index)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS completed_days_client_id_idx ON public.completed_days(client_id);
CREATE INDEX IF NOT EXISTS completed_days_completed_at_idx ON public.completed_days(completed_at DESC);
CREATE INDEX IF NOT EXISTS completed_days_status_idx ON public.completed_days(status);

-- ============================================
-- 3. AUTO-UPDATE TIMESTAMPS
-- ============================================
-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for workout_logs
DROP TRIGGER IF EXISTS update_workout_logs_updated_at ON public.workout_logs;
CREATE TRIGGER update_workout_logs_updated_at
  BEFORE UPDATE ON public.workout_logs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Triggers for completed_days
DROP TRIGGER IF EXISTS update_completed_days_updated_at ON public.completed_days;
CREATE TRIGGER update_completed_days_updated_at
  BEFORE UPDATE ON public.completed_days
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. ROW LEVEL SECURITY (Disabled for custom auth)
-- ============================================
-- We use custom auth with client_id, so we disable RLS and handle permissions in app code

-- Ensure RLS is disabled
ALTER TABLE public.workout_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.completed_days DISABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Users can view their own workout logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can insert their own workout logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can view their own completed days" ON public.completed_days;
DROP POLICY IF EXISTS "Users can manage their own completed days" ON public.completed_days;

-- ============================================
-- 5. COMMENTS
-- ============================================
COMMENT ON TABLE public.workout_logs IS 'Stores individual exercise logs from workouts';
COMMENT ON TABLE public.completed_days IS 'Tracks completed and skipped training days';
COMMENT ON COLUMN public.workout_logs.weights IS 'Array of weights per set (e.g., [20, 20, 17.5] for 3 sets)';
COMMENT ON COLUMN public.workout_logs.rating IS 'Flame rating from 0-5 (subjective difficulty/effort)';
COMMENT ON COLUMN public.completed_days.status IS 'Day status: completed (with logs) or skipped';

