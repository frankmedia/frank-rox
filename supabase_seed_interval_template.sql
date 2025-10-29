-- =====================================================
-- HYROX INTERVAL DAY TEMPLATE
-- Based on the user's example workout structure
-- =====================================================

DO $$
DECLARE
  -- Template IDs
  template_id UUID := gen_random_uuid();
  
  -- Day template ID
  day1_id UUID := gen_random_uuid();
  
  -- Block IDs
  block_mobility UUID := gen_random_uuid();
  block_agility UUID := gen_random_uuid();
  block_intervals_1 UUID := gen_random_uuid();
  block_intervals_2 UUID := gen_random_uuid();
  block_intervals_3 UUID := gen_random_uuid();
  block_intervals_4 UUID := gen_random_uuid();
  block_cooldown UUID := gen_random_uuid();
  block_stretch UUID := gen_random_uuid();
  
  -- Exercise IDs (we need to look these up)
  ex_inchworms UUID;
  ex_hip_openers UUID;
  ex_curtsy_lunges UUID;
  ex_mobility_squat UUID;
  ex_side_gallops UUID;
  ex_high_knee_skip UUID;
  ex_butt_kicks UUID;
  ex_grape_vine UUID;
  ex_run UUID;
  ex_sprint UUID;
  ex_easy_jog UUID;
  ex_easy_walk UUID;
  ex_hip_flexor_r UUID;
  ex_hip_flexor_l UUID;
  ex_hamstring_r UUID;
  ex_hamstring_l UUID;
  ex_quad_r UUID;
  ex_quad_l UUID;
  ex_glute_fig4_r UUID;
  ex_glute_fig4_l UUID;
  
BEGIN

-- =====================================================
-- LOOK UP EXERCISE IDs
-- =====================================================
SELECT id INTO ex_inchworms FROM exercises WHERE name = 'Inchworms' LIMIT 1;
SELECT id INTO ex_hip_openers FROM exercises WHERE name = 'Hip Openers' LIMIT 1;
SELECT id INTO ex_curtsy_lunges FROM exercises WHERE name = 'Curtsy Lunges' LIMIT 1;
SELECT id INTO ex_mobility_squat FROM exercises WHERE name = 'Bodyweight Squat (Mobility)' LIMIT 1;
SELECT id INTO ex_side_gallops FROM exercises WHERE name = 'Side Gallops' LIMIT 1;
SELECT id INTO ex_high_knee_skip FROM exercises WHERE name = 'High Knee Skip' LIMIT 1;
SELECT id INTO ex_butt_kicks FROM exercises WHERE name = 'Butt Kicks' LIMIT 1;
SELECT id INTO ex_grape_vine FROM exercises WHERE name = 'Grape Vine' LIMIT 1;
SELECT id INTO ex_run FROM exercises WHERE name = 'Run' LIMIT 1;
SELECT id INTO ex_sprint FROM exercises WHERE name = 'Sprint' LIMIT 1;
SELECT id INTO ex_easy_jog FROM exercises WHERE name = 'Easy Jog' LIMIT 1;
SELECT id INTO ex_easy_walk FROM exercises WHERE name = 'Easy Walk' LIMIT 1;
SELECT id INTO ex_hip_flexor_r FROM exercises WHERE name = 'Hip Flexor Stretch (Right)' LIMIT 1;
SELECT id INTO ex_hip_flexor_l FROM exercises WHERE name = 'Hip Flexor Stretch (Left)' LIMIT 1;
SELECT id INTO ex_hamstring_r FROM exercises WHERE name = 'Hamstring Stretch (Right)' LIMIT 1;
SELECT id INTO ex_hamstring_l FROM exercises WHERE name = 'Hamstring Stretch (Left)' LIMIT 1;
SELECT id INTO ex_quad_r FROM exercises WHERE name = 'Quad Stretch (Right)' LIMIT 1;
SELECT id INTO ex_quad_l FROM exercises WHERE name = 'Quad Stretch (Left)' LIMIT 1;
SELECT id INTO ex_glute_fig4_r FROM exercises WHERE name = 'Figure 4 Glute Stretch (Right)' LIMIT 1;
SELECT id INTO ex_glute_fig4_l FROM exercises WHERE name = 'Figure 4 Glute Stretch (Left)' LIMIT 1;

-- =====================================================
-- CREATE PROGRAM TEMPLATE
-- =====================================================
INSERT INTO program_templates (
  id,
  name,
  days_per_week,
  version,
  is_active,
  notes,
  created_by
)
VALUES (
  template_id,
  'HYROX Interval Day',
  1,  -- Single day template
  1,
  true,
  'Hybrid Race: Interval training with mobility, agility, running intervals, cooldown and stretch',
  (SELECT email FROM auth.users WHERE email LIKE '%admin%' OR email LIKE '%frank%' LIMIT 1)
);

-- =====================================================
-- CREATE DAY TEMPLATE
-- =====================================================
INSERT INTO day_templates (
  id,
  program_template_id,
  day_index,
  day_type,
  title,
  notes
)
VALUES (
  day1_id,
  template_id,
  1,
  'Consolidation',  -- Using Consolidation for mixed training day
  'Interval Training Day',
  '50min total: Mobility → Agility → Intervals → Cooldown → Stretch'
);

-- =====================================================
-- BLOCK 1: MOBILITY (5 min, 2 rounds)
-- =====================================================
INSERT INTO blocks (
  id,
  day_template_id,
  order_index,
  block_type,
  title,
  use_day_type_defaults,
  rest_seconds_default,
  notes
)
VALUES (
  block_mobility,
  day1_id,
  1,
  'Mobility',
  '5min Mobility',
  false,  -- We'll set explicit prescriptions
  30,     -- 30s rest between rounds
  '2 rounds, 30s each movement'
);

-- Add mobility exercises
INSERT INTO block_exercises (block_id, exercise_id, order_index, sets, time_seconds, rest_seconds)
VALUES
  (block_mobility, ex_inchworms, 1, 2, 30, 0),
  (block_mobility, ex_hip_openers, 2, 2, 30, 0),
  (block_mobility, ex_curtsy_lunges, 3, 2, 30, 0),
  (block_mobility, ex_mobility_squat, 4, 2, 30, 30);  -- 30s rest after last exercise

-- =====================================================
-- BLOCK 2: AGILITY (5 min, 2 rounds)
-- =====================================================
INSERT INTO blocks (
  id,
  day_template_id,
  order_index,
  block_type,
  title,
  use_day_type_defaults,
  rest_seconds_default,
  notes
)
VALUES (
  block_agility,
  day1_id,
  2,
  'WarmUp',
  '5min Agility',
  false,
  30,
  '2 rounds, 30s each drill'
);

-- Add agility exercises
INSERT INTO block_exercises (block_id, exercise_id, order_index, sets, time_seconds, rest_seconds)
VALUES
  (block_agility, ex_side_gallops, 1, 2, 30, 0),
  (block_agility, ex_high_knee_skip, 2, 2, 30, 0),
  (block_agility, ex_butt_kicks, 3, 2, 30, 0),
  (block_agility, ex_grape_vine, 4, 2, 30, 30);

-- =====================================================
-- BLOCK 3: INTERVALS PHASE 1 (10x 40s:20s)
-- =====================================================
INSERT INTO blocks (
  id,
  day_template_id,
  order_index,
  block_type,
  title,
  use_day_type_defaults,
  rest_seconds_default,
  notes
)
VALUES (
  block_intervals_1,
  day1_id,
  3,
  'Conditioning',
  '10 x 40s:20s Run',
  false,
  90,  -- 90s rest after block
  '10 rounds: 40s run, 20s walk. Then 90s rest.'
);

INSERT INTO block_exercises (block_id, exercise_id, order_index, sets, time_seconds, rest_seconds, intensity)
VALUES
  (block_intervals_1, ex_run, 1, 10, 40, 20, '{"zone": "Z3-Z4"}'::jsonb);

-- =====================================================
-- BLOCK 4: INTERVALS PHASE 2 (10x 30s:30s)
-- =====================================================
INSERT INTO blocks (
  id,
  day_template_id,
  order_index,
  block_type,
  title,
  use_day_type_defaults,
  rest_seconds_default,
  notes
)
VALUES (
  block_intervals_2,
  day1_id,
  4,
  'Conditioning',
  '10 x 30s:30s Sprint',
  false,
  90,
  '10 rounds: 30s sprint, 30s rest. Then 90s rest.'
);

INSERT INTO block_exercises (block_id, exercise_id, order_index, sets, time_seconds, rest_seconds, intensity)
VALUES
  (block_intervals_2, ex_sprint, 1, 10, 30, 30, '{"zone": "Z4"}'::jsonb);

-- =====================================================
-- BLOCK 5: INTERVALS PHASE 3 (8x 20s:10s)
-- =====================================================
INSERT INTO blocks (
  id,
  day_template_id,
  order_index,
  block_type,
  title,
  use_day_type_defaults,
  rest_seconds_default,
  notes
)
VALUES (
  block_intervals_3,
  day1_id,
  5,
  'Conditioning',
  '8 x 20s:10s Sprint',
  false,
  90,
  '8 rounds: 20s sprint, 10s rest. Then 90s rest.'
);

INSERT INTO block_exercises (block_id, exercise_id, order_index, sets, time_seconds, rest_seconds, intensity)
VALUES
  (block_intervals_3, ex_sprint, 1, 8, 20, 10, '{"zone": "Z4"}'::jsonb);

-- =====================================================
-- BLOCK 6: EASY JOG (90s)
-- =====================================================
INSERT INTO blocks (
  id,
  day_template_id,
  order_index,
  block_type,
  title,
  use_day_type_defaults,
  rest_seconds_default,
  notes
)
VALUES (
  block_intervals_4,
  day1_id,
  6,
  'Conditioning',
  'Easy Jog',
  false,
  0,
  '90s easy jog to transition to cooldown'
);

INSERT INTO block_exercises (block_id, exercise_id, order_index, sets, time_seconds, rest_seconds, intensity)
VALUES
  (block_intervals_4, ex_easy_jog, 1, 1, 90, 0, '{"zone": "Z2"}'::jsonb);

-- =====================================================
-- BLOCK 7: COOLDOWN (10 min walk)
-- =====================================================
INSERT INTO blocks (
  id,
  day_template_id,
  order_index,
  block_type,
  title,
  use_day_type_defaults,
  rest_seconds_default,
  notes
)
VALUES (
  block_cooldown,
  day1_id,
  7,
  'Cooldown',
  '10min Cool Down',
  false,
  0,
  'Easy walk. Get HR back to Z1-Z2'
);

INSERT INTO block_exercises (block_id, exercise_id, order_index, sets, time_seconds, rest_seconds, intensity)
VALUES
  (block_cooldown, ex_easy_walk, 1, 1, 600, 0, '{"zone": "Z1-Z2"}'::jsonb);

-- =====================================================
-- BLOCK 8: STRETCH (5 min static holds)
-- =====================================================
INSERT INTO blocks (
  id,
  day_template_id,
  order_index,
  block_type,
  title,
  use_day_type_defaults,
  rest_seconds_default,
  notes
)
VALUES (
  block_stretch,
  day1_id,
  8,
  'Stretch',
  '5min Stretch',
  false,
  0,
  '30s holds for each stretch'
);

-- Add stretch exercises (8 stretches x 30s = 240s = 4min)
INSERT INTO block_exercises (block_id, exercise_id, order_index, sets, time_seconds, rest_seconds)
VALUES
  (block_stretch, ex_hip_flexor_r, 1, 1, 30, 0),
  (block_stretch, ex_hip_flexor_l, 2, 1, 30, 0),
  (block_stretch, ex_hamstring_r, 3, 1, 30, 0),
  (block_stretch, ex_hamstring_l, 4, 1, 30, 0),
  (block_stretch, ex_quad_r, 5, 1, 30, 0),
  (block_stretch, ex_quad_l, 6, 1, 30, 0),
  (block_stretch, ex_glute_fig4_r, 7, 1, 30, 0),
  (block_stretch, ex_glute_fig4_l, 8, 1, 30, 0);

RAISE NOTICE '✅ Created HYROX Interval Day template with 8 blocks';

END $$;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================
SELECT 
  pt.name as template,
  dt.title as day,
  b.block_type,
  b.title as block_title,
  COUNT(be.id) as exercise_count
FROM program_templates pt
JOIN day_templates dt ON dt.program_template_id = pt.id
JOIN blocks b ON b.day_template_id = dt.id
LEFT JOIN block_exercises be ON be.block_id = b.id
WHERE pt.name = 'HYROX Interval Day'
GROUP BY pt.name, dt.title, b.order_index, b.block_type, b.title
ORDER BY b.order_index;

