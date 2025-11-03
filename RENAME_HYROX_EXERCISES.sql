-- Rename Hyrox exercises for cleaner display

-- 1. SkiErg Technique Drills → SkiErg
UPDATE exercises
SET name = 'SkiErg'
WHERE name = 'SkiErg Technique Drills';

-- 2. RowErg Steady Cardio → RowErg
UPDATE exercises
SET name = 'RowErg'
WHERE name = 'RowErg Steady Cardio';

-- 3. Lunges → Walking Lunges
UPDATE exercises
SET name = 'Walking Lunges'
WHERE name = 'Lunges';

-- Verify the changes:
SELECT id, name, modality
FROM exercises
WHERE name IN ('SkiErg', 'RowErg', 'Walking Lunges')
ORDER BY name;

-- ✅ After running this:
-- 1. The exercises will be renamed in the database
-- 2. Any NEW Hyrox Sims will use the new names
-- 3. For the EXISTING simulation, you need to delete it and recreate it
--    OR manually update the station names in the UI

