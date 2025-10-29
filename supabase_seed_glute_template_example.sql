-- =====================================================
-- EXAMPLE: Glute Hypertrophy Program Template
-- =====================================================
-- This demonstrates how to use the advanced template system
-- Run this AFTER the advanced_templates migration

-- =====================================================
-- STEP 1: Create the base template
-- =====================================================

INSERT INTO public.plan_templates (
  name,
  description,
  age_range,
  gender,
  fitness_level,
  goals,
  days_per_week,
  weeks_duration,
  includes_cardio,
  includes_strength,
  includes_mobility,
  includes_warmup,
  includes_cooldown,
  equipment_needed,
  program_type,
  primary_goal,
  movement_philosophy,
  auto_generate_enabled,
  requires_manual_selection,
  created_by,
  is_public
) VALUES (
  'Glute Hypertrophy 3x/Week',
  'Specialized glute-focused program with 4 movement patterns per session. 2 warmup sets + 4 working sets per movement. Includes minimal upper body work for balance.',
  '25-40',
  'any',
  'intermediate',
  ARRAY['muscle-gain', 'glute-specialization'],
  3,
  8,
  false, -- no separate cardio
  true,  -- strength work
  true,  -- mobility/warmup
  true,  -- always warmup
  true,  -- always cooldown
  ARRAY['machines', 'free-weights', 'cables', 'bodyweight'],
  'glute_specialization',
  'muscle_gain',
  'movement_patterns',
  false, -- Manual exercise selection
  true,  -- PT picks exercises
  'admin',
  true
);

-- =====================================================
-- STEP 2: Define movement requirements
-- =====================================================

-- Squat Pattern (3x per week, once per workout)
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  frequency_per_workout,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  placement_rule,
  specific_muscle_focus,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'squat',
  3, -- 3x per week
  1, -- Once per workout
  2, -- 2 warmup sets
  12, -- 12 reps warmup
  4, -- 4 working sets
  12, -- 12 reps working
  'near_fatigue',
  90,
  1, -- First exercise
  'start_of_workout',
  'glutes',
  'Focus on squat variations that emphasize glutes: goblet squat, Bulgarian split squat, hack squat'
);

-- Hinge Pattern
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  frequency_per_workout,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  placement_rule,
  specific_muscle_focus,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'hinge',
  3,
  1,
  2,
  12,
  4,
  12,
  'near_fatigue',
  90,
  2, -- Second exercise
  'start_of_workout',
  'glutes',
  'RDL, deadlift variations, kettlebell swings - focus on hip extension'
);

-- Thrust Pattern (Glute-specific)
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  frequency_per_workout,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  placement_rule,
  specific_muscle_focus,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'thrust',
  3,
  1,
  2,
  12,
  4,
  12,
  'near_fatigue',
  90,
  3, -- Third exercise
  'mid_workout',
  'glutes',
  'Hip thrust variations, glute bridges - maximal glute activation'
);

-- Abduction Pattern
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  frequency_per_workout,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  placement_rule,
  specific_muscle_focus,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'abduction',
  3,
  1,
  2,
  12,
  4,
  12,
  'near_fatigue',
  60,
  4, -- Fourth exercise
  'mid_workout',
  'glutes',
  'Cable abduction, machine abduction, banded walks - glute medius focus'
);

-- Push (minimal - for balance)
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  frequency_per_workout,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  placement_rule,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'push',
  3,
  1,
  0, -- No warmup
  0,
  3, -- Only 3 sets
  12,
  'moderate',
  60,
  5, -- Near end
  'end_of_workout',
  'Light push work for upper body balance - chest press, shoulder press'
);

-- Pull (minimal - for balance)
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  frequency_per_workout,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  placement_rule,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'pull',
  3,
  1,
  0,
  0,
  3,
  12,
  'moderate',
  60,
  6, -- Last exercise
  'end_of_workout',
  'Light pull work for upper body balance - rows, lat pulls'
);

-- =====================================================
-- STEP 3: Define workout structures
-- =====================================================

INSERT INTO public.template_workout_structures (
  template_id,
  workout_name,
  workout_type,
  day_in_cycle,
  week_frequency,
  structure_data,
  estimated_duration_minutes,
  difficulty_level,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'Glute Focus - Session A',
  'glute_hypertrophy',
  1, -- Monday
  1,
  '{
    "slots": [
      {"slot": 1, "movement": "squat", "sets": 4, "reps": 12, "warmup_sets": 2, "focus": "glutes"},
      {"slot": 2, "movement": "hinge", "sets": 4, "reps": 12, "warmup_sets": 2, "focus": "glutes"},
      {"slot": 3, "movement": "thrust", "sets": 4, "reps": 12, "warmup_sets": 2, "focus": "glutes"},
      {"slot": 4, "movement": "abduction", "sets": 4, "reps": 12, "warmup_sets": 2, "focus": "glutes"},
      {"slot": 5, "movement": "push", "sets": 3, "reps": 12, "warmup_sets": 0, "focus": "balance"},
      {"slot": 6, "movement": "pull", "sets": 3, "reps": 12, "warmup_sets": 0, "focus": "balance"}
    ]
  }',
  75,
  'hard',
  'Full glute workout with all 4 primary movements plus upper body maintenance'
);

-- Repeat for Days 3 and 5
INSERT INTO public.template_workout_structures (
  template_id,
  workout_name,
  workout_type,
  day_in_cycle,
  week_frequency,
  structure_data,
  estimated_duration_minutes,
  difficulty_level
) VALUES 
(
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'Glute Focus - Session B',
  'glute_hypertrophy',
  3, -- Wednesday
  1,
  '{
    "slots": [
      {"slot": 1, "movement": "squat", "sets": 4, "reps": 12, "warmup_sets": 2, "variation": "different_from_A"},
      {"slot": 2, "movement": "hinge", "sets": 4, "reps": 12, "warmup_sets": 2, "variation": "different_from_A"},
      {"slot": 3, "movement": "thrust", "sets": 4, "reps": 12, "warmup_sets": 2, "variation": "different_from_A"},
      {"slot": 4, "movement": "abduction", "sets": 4, "reps": 12, "warmup_sets": 2, "variation": "different_from_A"},
      {"slot": 5, "movement": "push", "sets": 3, "reps": 12, "warmup_sets": 0},
      {"slot": 6, "movement": "pull", "sets": 3, "reps": 12, "warmup_sets": 0}
    ]
  }',
  75,
  'hard'
),
(
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'Glute Focus - Session C',
  'glute_hypertrophy',
  5, -- Friday
  1,
  '{
    "slots": [
      {"slot": 1, "movement": "squat", "sets": 4, "reps": 12, "warmup_sets": 2, "variation": "different_from_A_and_B"},
      {"slot": 2, "movement": "hinge", "sets": 4, "reps": 12, "warmup_sets": 2, "variation": "different_from_A_and_B"},
      {"slot": 3, "movement": "thrust", "sets": 4, "reps": 12, "warmup_sets": 2, "variation": "different_from_A_and_B"},
      {"slot": 4, "movement": "abduction", "sets": 4, "reps": 12, "warmup_sets": 2, "variation": "different_from_A_and_B"},
      {"slot": 5, "movement": "push", "sets": 3, "reps": 12, "warmup_sets": 0},
      {"slot": 6, "movement": "pull", "sets": 3, "reps": 12, "warmup_sets": 0}
    ]
  }',
  75,
  'hard'
);

-- =====================================================
-- STEP 4: Define split logic
-- =====================================================

INSERT INTO public.template_split_logic (
  template_id,
  split_type,
  days_per_week,
  weekly_structure,
  progression_scheme,
  deload_frequency,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'custom',
  3,
  '{
    "week_pattern": [
      {"day": 1, "workout": "Session A", "focus": "glute_hypertrophy"},
      {"day": 2, "rest": true},
      {"day": 3, "workout": "Session B", "focus": "glute_hypertrophy"},
      {"day": 4, "rest": true},
      {"day": 5, "workout": "Session C", "focus": "glute_hypertrophy"},
      {"day": 6, "rest": true},
      {"day": 7, "rest": true}
    ]
  }',
  'linear',
  4,
  '3 workouts per week with rest days in between. Deload every 4th week.'
);

-- =====================================================
-- STEP 5: Define validation rules
-- =====================================================

INSERT INTO public.template_rules (
  template_id,
  rule_type,
  rule_description,
  validation_logic,
  priority,
  warning_message
) VALUES 
(
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'movement_coverage',
  'Must include all 4 glute-focused movement patterns per workout',
  '{
    "type": "movement_coverage",
    "requirements": {
      "squat": {"min": 1, "max": 1},
      "hinge": {"min": 1, "max": 1},
      "thrust": {"min": 1, "max": 1},
      "abduction": {"min": 1, "max": 1}
    },
    "scope": "per_workout"
  }',
  'required',
  '⚠️ Each workout must include 1 squat, 1 hinge, 1 thrust, and 1 abduction exercise'
),
(
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'volume',
  'Each glute movement should have 2 warmup + 4 working sets',
  '{
    "type": "volume",
    "requirements": {
      "warmup_sets": 2,
      "working_sets": 4,
      "working_reps": 12,
      "applies_to": ["squat", "hinge", "thrust", "abduction"]
    }
  }',
  'required',
  '⚠️ Glute exercises should follow: 2x12 warmup, 4x12 working sets'
),
(
  (SELECT id FROM public.plan_templates WHERE name = 'Glute Hypertrophy 3x/Week' LIMIT 1),
  'frequency',
  'Program requires exactly 3 workouts per week',
  '{
    "type": "frequency",
    "requirements": {
      "workouts_per_week": 3,
      "rest_days_between": 1
    }
  }',
  'required',
  '⚠️ This program requires exactly 3 workouts per week with rest days in between'
);

-- =====================================================
-- Display confirmation
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Glute Hypertrophy Template created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE 'Template includes:';
  RAISE NOTICE '  - 6 movement requirements (squat, hinge, thrust, abduction, push, pull)';
  RAISE NOTICE '  - 3 workout structures (Session A, B, C)';
  RAISE NOTICE '  - 1 split logic (3x per week)';
  RAISE NOTICE '  - 3 validation rules';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Tag exercises in your library with movement patterns';
  RAISE NOTICE '  2. Build the template-based plan creator UI';
  RAISE NOTICE '  3. Use this template to generate plans for clients';
END $$;

-- View the template
SELECT 
  pt.name,
  pt.days_per_week,
  COUNT(DISTINCT tmr.id) as movement_requirements,
  COUNT(DISTINCT tws.id) as workout_structures,
  COUNT(DISTINCT tr.id) as validation_rules
FROM public.plan_templates pt
LEFT JOIN public.template_movement_requirements tmr ON pt.id = tmr.template_id
LEFT JOIN public.template_workout_structures tws ON pt.id = tws.template_id
LEFT JOIN public.template_rules tr ON pt.id = tr.template_id
WHERE pt.name = 'Glute Hypertrophy 3x/Week'
GROUP BY pt.id, pt.name, pt.days_per_week;

