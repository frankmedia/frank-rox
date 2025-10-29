-- ============================================
-- ADD MISSING EXERCISES FOR MATT'S PROGRAM
-- ============================================
-- Run this AFTER checking which exercises are missing with supabase_check_matt_exercises.sql

DO $$
BEGIN
    -- Function to insert exercise if it doesn't exist
    -- Mobility exercises
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Inchworms', 'mobility', 'Dynamic warm-up movement'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'inchworms');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Hip Openers', 'mobility', 'Hip mobility exercise'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'hip openers');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Curtsy Lunges', 'mobility', 'Mobility and activation'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'curtsy lunges');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Squat Hold', 'mobility', 'Static hold for mobility'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'squat hold');
    
    -- Agility exercises (using 'mobility' modality)
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Side Gallops', 'mobility', 'Lateral movement drill'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'side gallops');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'High Knee Skip', 'mobility', 'Dynamic running drill'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'high knee skip');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Butt Kicks', 'mobility', 'Running drill for hamstrings'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'butt kicks');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Grape Vine', 'mobility', 'Lateral coordination drill'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'grape vine');
    
    -- Cardio exercises
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Run Intervals', 'cardio', 'Interval running workout'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'run intervals');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Easy Walk', 'cardio', 'Cool down walking'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'easy walk');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Easy Swim', 'cardio', 'Low intensity recovery swim'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'easy swim');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Easy Cycle', 'cardio', 'Low intensity recovery cycle'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'easy cycle');
    
    -- Stretch exercises (using 'mobility' modality)
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Hip Flexor Stretch', 'mobility', 'Static stretch for hip flexors'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'hip flexor stretch');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Hamstring Stretch', 'mobility', 'Static stretch for hamstrings'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'hamstring stretch');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Quad Stretch', 'mobility', 'Static stretch for quadriceps'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'quad stretch');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Figure of 4 Stretch', 'mobility', 'Glute and hip stretch'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'figure of 4 stretch');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Full Body Stretch', 'mobility', 'Comprehensive stretching routine'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'full body stretch');
    
    -- Core exercises
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Pelvic Tilting Plank', 'core', 'Plank with pelvic tilt'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'pelvic tilting plank');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Crunches', 'core', 'Abdominal crunches'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'crunches');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Press Up Plank', 'core', 'Plank with press-up variations'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'press up plank');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Side Plank', 'core', 'Static side plank hold'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'side plank');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Bridge with Resistance Band', 'core', 'Glute bridge with band'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'bridge with resistance band');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Flutter Kicks', 'core', 'Core exercise for lower abs'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'flutter kicks');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Scissor Legs', 'core', 'Core exercise for lower abs'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'scissor legs');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Russian Twists', 'core', 'Rotational core exercise'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'russian twists');
    
    -- Strength exercises
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Squats', 'strength', 'Barbell or bodyweight squats'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'squats');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Squat', 'strength', 'Barbell squat'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'squat');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Single Leg Deadlift', 'strength', 'Unilateral deadlift variation'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'single leg deadlift');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Deadlift', 'strength', 'Barbell deadlift'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'deadlift');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Alternating Reverse Lunge', 'strength', 'Reverse lunge variation'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'alternating reverse lunge');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Bent Over Row', 'strength', 'Back exercise with barbell or dumbbells'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'bent over row');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Pull Ups', 'bodyweight', 'Bodyweight upper body pull'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'pull ups');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Pull Up', 'bodyweight', 'Bodyweight upper body pull'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'pull up');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Bicep Curls', 'strength', 'Dumbbell bicep curls'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'bicep curls');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'DB Chest Press', 'strength', 'Dumbbell chest press'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'db chest press');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Bench Press', 'strength', 'Barbell bench press'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'bench press');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'DB Shoulder Press', 'strength', 'Dumbbell shoulder press'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'db shoulder press');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Overhead DB Tricep Extensions', 'strength', 'Overhead tricep extension with dumbbell'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'overhead db tricep extensions');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Single Arm DB Row', 'strength', 'Unilateral dumbbell row'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'single arm db row');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Weighted Vest Calf Raises', 'strength', 'Calf raises with weighted vest'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'weighted vest calf raises');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Single Leg Calf Raises', 'strength', 'Unilateral calf raise'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'single leg calf raises');
    
    -- CrossFit placeholders
    INSERT INTO exercises (name, modality, notes)
    SELECT 'Mobility Work', 'mobility', 'Follow gym programming'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'mobility work');
    
    INSERT INTO exercises (name, modality, notes)
    SELECT 'WOD', 'cardio', 'Workout of the Day - Follow gym programming'
    WHERE NOT EXISTS (SELECT 1 FROM exercises WHERE LOWER(TRIM(name)) = 'wod');
    
    RAISE NOTICE '✅ All missing exercises have been added to the exercises table!';
    RAISE NOTICE '📊 Run supabase_check_matt_exercises.sql again to verify';
END $$;

