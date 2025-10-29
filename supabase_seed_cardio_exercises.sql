-- =====================================================
-- CARDIO/HYROX EXERCISE LIBRARY SEEDER
-- Seeds exercises for mobility, agility, intervals, cooldown, stretch
-- =====================================================

-- First, let's add some exercise IDs we'll reference
DO $$
DECLARE
  -- Mobility exercises
  ex_inchworms UUID := gen_random_uuid();
  ex_hip_openers UUID := gen_random_uuid();
  ex_curtsy_lunges UUID := gen_random_uuid();
  ex_mobility_squat UUID := gen_random_uuid();
  
  -- Agility exercises
  ex_side_gallops UUID := gen_random_uuid();
  ex_high_knee_skip UUID := gen_random_uuid();
  ex_butt_kicks UUID := gen_random_uuid();
  ex_grape_vine UUID := gen_random_uuid();
  
  -- Cardio exercises
  ex_run UUID := gen_random_uuid();
  ex_sprint UUID := gen_random_uuid();
  ex_easy_jog UUID := gen_random_uuid();
  ex_easy_walk UUID := gen_random_uuid();
  
  -- Stretch exercises
  ex_hip_flexor_r UUID := gen_random_uuid();
  ex_hip_flexor_l UUID := gen_random_uuid();
  ex_hamstring_r UUID := gen_random_uuid();
  ex_hamstring_l UUID := gen_random_uuid();
  ex_quad_r UUID := gen_random_uuid();
  ex_quad_l UUID := gen_random_uuid();
  ex_glute_fig4_r UUID := gen_random_uuid();
  ex_glute_fig4_l UUID := gen_random_uuid();
BEGIN

-- =====================================================
-- MOBILITY EXERCISES
-- =====================================================
INSERT INTO exercises (id, name, modality, primary_area, pattern, equipment, tags, notes, movement_pattern, plane_of_motion, primary_muscle_group, exercise_complexity)
VALUES
(ex_inchworms, 'Inchworms', 'mobility', 'full', 'na', '{}', 'warmup,mobility,dynamic', 'Dynamic stretch for hamstrings and shoulders', 'Multi-Planar', 'Sagittal', 'Full Body', 'Beginner'),
(ex_hip_openers, 'Hip Openers', 'mobility', 'lower', 'na', '{}', 'warmup,mobility,hips', 'Dynamic hip mobility drill', 'Hip Mobility', 'Transverse', 'Hips', 'Beginner'),
(ex_curtsy_lunges, 'Curtsy Lunges', 'mobility', 'lower', 'na', '{}', 'warmup,mobility,glutes,dynamic', 'Dynamic lunge variation for glutes and hips', 'Lunge Pattern', 'Transverse', 'Glutes', 'Beginner'),
(ex_mobility_squat, 'Bodyweight Squat (Mobility)', 'mobility', 'lower', 'squat', '{}', 'warmup,mobility,squat', 'Air squat for warmup and mobility', 'Squat', 'Sagittal', 'Quads', 'Beginner');

-- =====================================================
-- AGILITY EXERCISES
-- =====================================================
INSERT INTO exercises (id, name, modality, primary_area, pattern, equipment, tags, notes, movement_pattern, plane_of_motion, primary_muscle_group, exercise_complexity)
VALUES
(ex_side_gallops, 'Side Gallops', 'cardio', 'full', 'na', '{}', 'agility,lateral,warmup', 'Lateral movement drill', 'Lateral', 'Frontal', 'Legs', 'Beginner'),
(ex_high_knee_skip, 'High Knee Skip', 'cardio', 'full', 'na', '{}', 'agility,coordination,warmup', 'Skipping with high knees', 'Skip', 'Sagittal', 'Hip Flexors', 'Beginner'),
(ex_butt_kicks, 'Butt Kicks', 'cardio', 'lower', 'na', '{}', 'agility,hamstrings,warmup', 'Running in place with heel to glute', 'Running', 'Sagittal', 'Hamstrings', 'Beginner'),
(ex_grape_vine, 'Grape Vine', 'cardio', 'full', 'na', '{}', 'agility,coordination,lateral', 'Lateral crossover footwork drill', 'Lateral', 'Frontal', 'Legs', 'Beginner');

-- =====================================================
-- CARDIO/RUNNING EXERCISES
-- =====================================================
INSERT INTO exercises (id, name, modality, primary_area, pattern, equipment, tags, notes, movement_pattern, plane_of_motion, primary_muscle_group, exercise_complexity)
VALUES
(ex_run, 'Run', 'running', 'full', 'na', '{}', 'cardio,endurance,Z3,Z4', 'Moderate intensity running', 'Running', 'Sagittal', 'Legs', 'Beginner'),
(ex_sprint, 'Sprint', 'running', 'full', 'na', '{}', 'cardio,power,Z4,intervals', 'High intensity sprint', 'Running', 'Sagittal', 'Legs', 'Intermediate'),
(ex_easy_jog, 'Easy Jog', 'running', 'full', 'na', '{}', 'cardio,recovery,Z2', 'Recovery pace jog', 'Running', 'Sagittal', 'Legs', 'Beginner'),
(ex_easy_walk, 'Easy Walk', 'cardio', 'full', 'na', '{}', 'cooldown,recovery,Z1', 'Active recovery walk', 'Walking', 'Sagittal', 'Legs', 'Beginner');

-- =====================================================
-- STRETCH EXERCISES
-- =====================================================
INSERT INTO exercises (id, name, modality, primary_area, pattern, equipment, tags, notes, movement_pattern, plane_of_motion, primary_muscle_group, exercise_complexity)
VALUES
(ex_hip_flexor_r, 'Hip Flexor Stretch (Right)', 'mobility', 'lower', 'na', '{}', 'stretch,static,hips,cooldown', 'Static stretch for hip flexors', 'Static Stretch', 'Sagittal', 'Hip Flexors', 'Beginner'),
(ex_hip_flexor_l, 'Hip Flexor Stretch (Left)', 'mobility', 'lower', 'na', '{}', 'stretch,static,hips,cooldown', 'Static stretch for hip flexors', 'Static Stretch', 'Sagittal', 'Hip Flexors', 'Beginner'),
(ex_hamstring_r, 'Hamstring Stretch (Right)', 'mobility', 'lower', 'na', '{}', 'stretch,static,hamstrings,cooldown', 'Static stretch for hamstrings', 'Static Stretch', 'Sagittal', 'Hamstrings', 'Beginner'),
(ex_hamstring_l, 'Hamstring Stretch (Left)', 'mobility', 'lower', 'na', '{}', 'stretch,static,hamstrings,cooldown', 'Static stretch for hamstrings', 'Static Stretch', 'Sagittal', 'Hamstrings', 'Beginner'),
(ex_quad_r, 'Quad Stretch (Right)', 'mobility', 'lower', 'na', '{}', 'stretch,static,quads,cooldown', 'Static stretch for quadriceps', 'Static Stretch', 'Sagittal', 'Quads', 'Beginner'),
(ex_quad_l, 'Quad Stretch (Left)', 'mobility', 'lower', 'na', '{}', 'stretch,static,quads,cooldown', 'Static stretch for quadriceps', 'Static Stretch', 'Sagittal', 'Quads', 'Beginner'),
(ex_glute_fig4_r, 'Figure 4 Glute Stretch (Right)', 'mobility', 'lower', 'na', '{}', 'stretch,static,glutes,cooldown', 'Seated or lying figure-4 glute stretch', 'Static Stretch', 'Transverse', 'Glutes', 'Beginner'),
(ex_glute_fig4_l, 'Figure 4 Glute Stretch (Left)', 'mobility', 'lower', 'na', '{}', 'stretch,static,glutes,cooldown', 'Seated or lying figure-4 glute stretch', 'Static Stretch', 'Transverse', 'Glutes', 'Beginner');

RAISE NOTICE '✅ Seeded % exercises for cardio/HYROX training', 20;

END $$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
SELECT 
  modality,
  COUNT(*) as count
FROM exercises
WHERE tags LIKE '%warmup%' 
   OR tags LIKE '%agility%' 
   OR tags LIKE '%intervals%'
   OR tags LIKE '%stretch%'
   OR tags LIKE '%cooldown%'
GROUP BY modality
ORDER BY modality;

