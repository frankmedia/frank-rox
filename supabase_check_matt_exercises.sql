-- ============================================
-- CHECK WHICH EXERCISES EXIST FOR MATT'S PROGRAM
-- ============================================

-- All exercises needed for Matt's 14-day program
WITH required_exercises AS (
  SELECT unnest(ARRAY[
    -- Day 1 & 8: Interval Run
    'Inchworms',
    'Hip Openers',
    'Curtsy Lunges',
    'Squat Hold',
    'Side Gallops',
    'High Knee Skip',
    'Butt Kicks',
    'Grape Vine',
    'Run Intervals',
    'Easy Walk',
    'Hip Flexor Stretch',
    'Hamstring Stretch',
    'Quad Stretch',
    'Figure of 4 Stretch',
    
    -- Day 2 & 9: Core + Strong
    'Pelvic Tilting Plank',
    'Crunches',
    'Press Up Plank',
    'Side Plank',
    'Bridge with Resistance Band',
    'Flutter Kicks',
    'Scissor Legs',
    'Russian Twists',
    'Squats',
    'Single Leg Deadlift',
    'Alternating Reverse Lunge',
    'Bent Over Row',
    'Pull Ups',
    'Bicep Curls',
    'DB Chest Press',
    'DB Shoulder Press',
    'Overhead DB Tricep Extensions',
    
    -- Day 4 & 11: Lift Class
    'Bench Press',
    'Pull Up',
    'Squat',
    'Deadlift',
    'Single Arm DB Row',
    'Weighted Vest Calf Raises',
    'Single Leg Calf Raises',
    
    -- Day 5, 7, 12, 14: Active Recovery
    'Easy Swim',
    'Easy Cycle',
    
    -- Day 6 & 13: CrossFit
    'Mobility Work',
    'WOD',
    'Full Body Stretch'
  ]) as exercise_name
)
SELECT 
  re.exercise_name as required_exercise,
  e.id as exercise_id,
  e.name as existing_name,
  e.modality,
  CASE 
    WHEN e.id IS NULL THEN '❌ MISSING'
    ELSE '✅ EXISTS'
  END as status
FROM required_exercises re
LEFT JOIN exercises e ON LOWER(TRIM(e.name)) = LOWER(TRIM(re.exercise_name))
ORDER BY 
  CASE WHEN e.id IS NULL THEN 0 ELSE 1 END,  -- Missing first
  re.exercise_name;

-- Summary
SELECT 
  COUNT(*) FILTER (WHERE e.id IS NOT NULL) as exercises_found,
  COUNT(*) FILTER (WHERE e.id IS NULL) as exercises_missing,
  COUNT(*) as total_required
FROM (
  SELECT unnest(ARRAY[
    'Inchworms', 'Hip Openers', 'Curtsy Lunges', 'Squat Hold',
    'Side Gallops', 'High Knee Skip', 'Butt Kicks', 'Grape Vine',
    'Run Intervals', 'Easy Walk', 'Hip Flexor Stretch', 'Hamstring Stretch',
    'Quad Stretch', 'Figure of 4 Stretch', 'Pelvic Tilting Plank', 'Crunches',
    'Press Up Plank', 'Side Plank', 'Bridge with Resistance Band', 'Flutter Kicks',
    'Scissor Legs', 'Russian Twists', 'Squats', 'Single Leg Deadlift',
    'Alternating Reverse Lunge', 'Bent Over Row', 'Pull Ups', 'Bicep Curls',
    'DB Chest Press', 'DB Shoulder Press', 'Overhead DB Tricep Extensions',
    'Bench Press', 'Pull Up', 'Squat', 'Deadlift', 'Single Arm DB Row',
    'Weighted Vest Calf Raises', 'Single Leg Calf Raises', 'Easy Swim',
    'Easy Cycle', 'Mobility Work', 'WOD', 'Full Body Stretch'
  ]) as exercise_name
) re
LEFT JOIN exercises e ON LOWER(TRIM(e.name)) = LOWER(TRIM(re.exercise_name));

