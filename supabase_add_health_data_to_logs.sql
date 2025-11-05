-- Add health data columns to workout_logs table

ALTER TABLE workout_logs
ADD COLUMN IF NOT EXISTS steps_count INTEGER,
ADD COLUMN IF NOT EXISTS avg_heart_rate INTEGER,
ADD COLUMN IF NOT EXISTS distance_km DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS calories_burned INTEGER,
ADD COLUMN IF NOT EXISTS sleep_hours DECIMAL(4, 1);

-- Add comment explaining the columns
COMMENT ON COLUMN workout_logs.steps_count IS 'Total steps for the day from Health Connect';
COMMENT ON COLUMN workout_logs.avg_heart_rate IS 'Average heart rate in BPM for the day';
COMMENT ON COLUMN workout_logs.distance_km IS 'Total distance in kilometers for the day';
COMMENT ON COLUMN workout_logs.calories_burned IS 'Total active calories burned for the day';
COMMENT ON COLUMN workout_logs.sleep_hours IS 'Total sleep hours for the previous night';

