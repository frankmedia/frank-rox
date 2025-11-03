-- Check if simulation workout logs exist in workout_logs
SELECT 
  id,
  client_id,
  training_day,
  exercise_name,
  exercise_type,
  details,
  logged_at,
  created_at
FROM workout_logs
WHERE exercise_type = 'simulation'
ORDER BY created_at DESC
LIMIT 10;

