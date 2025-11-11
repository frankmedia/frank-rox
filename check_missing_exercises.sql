-- Check which exercises are missing from the database
-- These are the exercises the programme builder tries to find

-- LOWER BODY EXERCISES
SELECT 'Squat/Back Squat/Barbell Squat' as search_term, COUNT(*) as found
FROM exercises
WHERE name ILIKE '%Squat%' OR name ILIKE '%Back Squat%' OR name ILIKE '%Barbell Squat%'
UNION ALL
SELECT 'Rear-Foot Elevated Split Squat/Split Squat/DB Split Squat', COUNT(*)
FROM exercises
WHERE name ILIKE '%Rear-Foot Elevated Split Squat%' OR name ILIKE '%Split Squat%' OR name ILIKE '%DB Split Squat%'
UNION ALL
SELECT 'Romanian Deadlift/RDL/DB Romanian Deadlift', COUNT(*)
FROM exercises
WHERE name ILIKE '%Romanian Deadlift%' OR name ILIKE '%RDL%' OR name ILIKE '%DB Romanian Deadlift%'
UNION ALL
SELECT 'Leg Press', COUNT(*)
FROM exercises
WHERE name ILIKE '%Leg Press%'
UNION ALL
SELECT 'Plank', COUNT(*)
FROM exercises
WHERE name ILIKE '%Plank%'

-- UPPER BODY EXERCISES
UNION ALL
SELECT 'Bench Press/DB Chest Press/Chest Press', COUNT(*)
FROM exercises
WHERE name ILIKE '%Bench Press%' OR name ILIKE '%DB Chest Press%' OR name ILIKE '%Chest Press%'
UNION ALL
SELECT 'Bent Over Row/DB Bent-Over Row/Single Arm DB Row', COUNT(*)
FROM exercises
WHERE name ILIKE '%Bent Over Row%' OR name ILIKE '%DB Bent-Over Row%' OR name ILIKE '%Single Arm DB Row%'
UNION ALL
SELECT 'DB Shoulder Press/Shoulder Press/DB Overhead Press', COUNT(*)
FROM exercises
WHERE name ILIKE '%DB Shoulder Press%' OR name ILIKE '%Shoulder Press%' OR name ILIKE '%DB Overhead Press%'
UNION ALL
SELECT 'Lat Pulldown/Wide Grip Pull Up/Pull Up', COUNT(*)
FROM exercises
WHERE name ILIKE '%Lat Pulldown%' OR name ILIKE '%Wide Grip Pull Up%' OR name ILIKE '%Pull Up%'
UNION ALL
SELECT 'DB Bicep Curl/Bicep Curl', COUNT(*)
FROM exercises
WHERE name ILIKE '%DB Bicep Curl%' OR name ILIKE '%Bicep Curl%'
UNION ALL
SELECT 'Overhead DB Tricep Extension/DB Skull Crusher/Tricep Dips', COUNT(*)
FROM exercises
WHERE name ILIKE '%Overhead DB Tricep Extension%' OR name ILIKE '%DB Skull Crusher%' OR name ILIKE '%Tricep Dips%'

-- MOBILITY EXERCISES
UNION ALL
SELECT 'Cat-Cow', COUNT(*)
FROM exercises
WHERE name ILIKE '%Cat-Cow%'
UNION ALL
SELECT 'Hip Flexor Stretch', COUNT(*)
FROM exercises
WHERE name ILIKE '%Hip Flexor Stretch%'
UNION ALL
SELECT 'Glute Bridge', COUNT(*)
FROM exercises
WHERE name ILIKE '%Glute Bridge%'
UNION ALL
SELECT 'Inchworms', COUNT(*)
FROM exercises
WHERE name ILIKE '%Inchworms%'
UNION ALL
SELECT 'Thoracic Rotation (Open Book)', COUNT(*)
FROM exercises
WHERE name ILIKE '%Thoracic Rotation%' OR name ILIKE '%Open Book%'
UNION ALL
SELECT 'Standing Hip CARs', COUNT(*)
FROM exercises
WHERE name ILIKE '%Standing Hip CARs%'
UNION ALL
SELECT '90/90 Hip Switches', COUNT(*)
FROM exercises
WHERE name ILIKE '%90/90 Hip Switches%'
UNION ALL
SELECT 'Hamstring Stretch', COUNT(*)
FROM exercises
WHERE name ILIKE '%Hamstring Stretch%'
UNION ALL
SELECT 'Quad Stretch', COUNT(*)
FROM exercises
WHERE name ILIKE '%Quad Stretch%'
UNION ALL
SELECT 'Cossack Squat', COUNT(*)
FROM exercises
WHERE name ILIKE '%Cossack Squat%'
UNION ALL
SELECT 'Figure of 4 Stretch', COUNT(*)
FROM exercises
WHERE name ILIKE '%Figure of 4 Stretch%'
UNION ALL
SELECT 'Bird Dog', COUNT(*)
FROM exercises
WHERE name ILIKE '%Bird Dog%'
UNION ALL
SELECT 'Dead Bug', COUNT(*)
FROM exercises
WHERE name ILIKE '%Dead Bug%';

-- Show exercises with found = 0 (these are MISSING!)
-- If found > 0, the exercise exists in the database

