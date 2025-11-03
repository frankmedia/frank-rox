-- Check if simulation workout logs exist in workout_logs
SELECT 
  id,
  client_id,
  training_day,
  exercise_name,
  duration_min,
  notes,
  logged_at,
  created_at
FROM workout_logs
WHERE exercise_name LIKE 'Sim:%'
ORDER BY created_at DESC
LIMIT 10;

