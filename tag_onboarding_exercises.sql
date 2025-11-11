-- Tag all exercises used in the onboarding programme generation
-- This allows filtering exercises by 'onboarding' tag

-- ============================================
-- RUNNING EXERCISES (runGenerator.ts)
-- ============================================
UPDATE exercises
SET tags = CASE 
  WHEN tags IS NULL OR tags = '' THEN 'onboarding'
  WHEN tags NOT LIKE '%onboarding%' THEN tags || ', onboarding'
  ELSE tags
END
WHERE name ILIKE ANY(ARRAY[
  '%Run%',
  '%Running%'
])
AND modality = 'cardio';

-- ============================================
-- STRENGTH EXERCISES (strengthGenerator.ts)
-- ============================================

-- Lower Body
UPDATE exercises
SET tags = CASE 
  WHEN tags IS NULL OR tags = '' THEN 'onboarding'
  WHEN tags NOT LIKE '%onboarding%' THEN tags || ', onboarding'
  ELSE tags
END
WHERE name ILIKE ANY(ARRAY[
  '%Squat%',
  '%Back Squat%',
  '%Barbell Squat%',
  '%Goblet Squat%',
  '%Dumbbell Goblet Squat%',
  '%Split Squat%',
  '%Bulgarian Split Squat%',
  '%Rear-Foot Elevated Split Squat%',
  '%Romanian Deadlift%',
  '%RDL%',
  '%DB Romanian Deadlift%',
  '%Leg Press%',
  '%Leg Extension%',
  '%Hamstring Curl%',
  '%Lying Hamstring Curl%'
]);

-- Upper Body - Push
UPDATE exercises
SET tags = CASE 
  WHEN tags IS NULL OR tags = '' THEN 'onboarding'
  WHEN tags NOT LIKE '%onboarding%' THEN tags || ', onboarding'
  ELSE tags
END
WHERE name ILIKE ANY(ARRAY[
  '%Bench Press%',
  '%Incline Bench Press%',
  '%Dumbbell Bench Press%',
  '%DB Bench Press%',
  '%Push-Up%',
  '%Push Up%',
  '%Shoulder Press%',
  '%DB Shoulder Press%',
  '%Overhead Press%',
  '%Dip%',
  '%Chest Dip%'
]);

-- Upper Body - Pull
UPDATE exercises
SET tags = CASE 
  WHEN tags IS NULL OR tags = '' THEN 'onboarding'
  WHEN tags NOT LIKE '%onboarding%' THEN tags || ', onboarding'
  ELSE tags
END
WHERE name ILIKE ANY(ARRAY[
  '%Row%',
  '%Bent Over Row%',
  '%Barbell Row%',
  '%Dumbbell Row%',
  '%DB Row%',
  '%Pull-Up%',
  '%Pull Up%',
  '%Chin-Up%',
  '%Chin Up%',
  '%Lat Pulldown%',
  '%Lat Pull Down%',
  '%Face Pull%'
]);

-- Arms
UPDATE exercises
SET tags = CASE 
  WHEN tags IS NULL OR tags = '' THEN 'onboarding'
  WHEN tags NOT LIKE '%onboarding%' THEN tags || ', onboarding'
  ELSE tags
END
WHERE name ILIKE ANY(ARRAY[
  '%Bicep Curl%',
  '%DB Bicep Curl%',
  '%Dumbbell Curl%',
  '%Hammer Curl%',
  '%Tricep Extension%',
  '%Overhead Tricep Extension%',
  '%Overhead DB Tricep Extension%',
  '%Tricep Pushdown%',
  '%Skull Crusher%'
]);

-- ============================================
-- CARDIO/CONDITIONING EXERCISES (cardioGenerator.ts & hyroxGenerator.ts)
-- ============================================
UPDATE exercises
SET tags = CASE 
  WHEN tags IS NULL OR tags = '' THEN 'onboarding'
  WHEN tags NOT LIKE '%onboarding%' THEN tags || ', onboarding'
  ELSE tags
END
WHERE name ILIKE ANY(ARRAY[
  '%RowErg%',
  '%Row Erg%',
  '%Rowing Machine%',
  '%SkiErg%',
  '%Ski Erg%',
  '%Assault Bike%',
  '%Air Bike%',
  '%Echo Bike%',
  '%Burpee%',
  '%Box Jump%',
  '%Jump Rope%',
  '%Double Under%',
  '%Wall Ball%',
  '%Thruster%',
  '%Kettlebell Swing%',
  '%KB Swing%'
]);

-- ============================================
-- RECOVERY/MOBILITY EXERCISES (recoveryGenerator.ts)
-- ============================================
UPDATE exercises
SET tags = CASE 
  WHEN tags IS NULL OR tags = '' THEN 'onboarding'
  WHEN tags NOT LIKE '%onboarding%' THEN tags || ', onboarding'
  ELSE tags
END
WHERE name ILIKE ANY(ARRAY[
  '%Cat-Cow%',
  '%Hip Flexor Stretch%',
  '%Glute Bridge%',
  '%Band Pull-Apart%',
  '%Band Pull Apart%',
  '%Inchworms%',
  '%Inchworm%',
  '%Thoracic Rotation%',
  '%Open Book%',
  '%Standing Hip CARs%',
  '%Hip CARs%',
  '%90/90 Hip Switches%',
  '%Hip Switches%',
  '%Hamstring Stretch%',
  '%Quad Stretch%',
  '%Cossack Squat%',
  '%Figure of 4%',
  '%Figure 4%',
  '%Bird Dog%',
  '%Dead Bug%',
  '%Plank%',
  '%Ankle Dorsiflexion%',
  '%Foam Roller%'
]);

-- ============================================
-- VERIFICATION: Check tagged exercises
-- ============================================
SELECT 
  modality,
  COUNT(*) as exercise_count,
  STRING_AGG(DISTINCT name, ', ' ORDER BY name) as exercises
FROM exercises
WHERE tags LIKE '%onboarding%'
GROUP BY modality
ORDER BY modality;

-- Total count
SELECT COUNT(*) as total_onboarding_exercises
FROM exercises
WHERE tags LIKE '%onboarding%';
