-- Migration: Add Simulation Support to Workout Logs
-- Description: Adds exercise_type and details columns to support simulation workouts

-- Add exercise_type column to distinguish workout types
ALTER TABLE public.workout_logs 
ADD COLUMN IF NOT EXISTS exercise_type TEXT;

-- Add details column for storing structured data (JSON)
-- This will store simulation splits, AMRAP results, etc.
ALTER TABLE public.workout_logs 
ADD COLUMN IF NOT EXISTS details JSONB;

-- Create index on exercise_type for filtering
CREATE INDEX IF NOT EXISTS workout_logs_exercise_type_idx ON public.workout_logs(exercise_type);

-- Create GIN index on details for JSONB queries
CREATE INDEX IF NOT EXISTS workout_logs_details_idx ON public.workout_logs USING GIN (details);

-- Add comments
COMMENT ON COLUMN public.workout_logs.exercise_type IS 'Type of workout: strength, cardio, simulation, circuit, etc.';
COMMENT ON COLUMN public.workout_logs.details IS 'Structured workout data (JSON): splits for simulations, rounds for AMRAPs, etc.';

-- Example of details structure for simulation:
-- {
--   "total_time": 3600000,
--   "splits": [
--     {"station": "1km Run", "elapsed": 240000, "complete": true},
--     {"station": "SkiErg", "elapsed": 180000, "complete": true}
--   ],
--   "completed_at": "2024-11-03T12:00:00Z"
-- }

