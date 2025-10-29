-- HYROX Template: 12-Week Hybrid Racing Program
-- Based on Base → Build → Competition → Taper periodization
-- 5 sessions per week: 2 Upper, 2 Lower, 1-2 Run/Erg

-- Step 1: Create the main template
INSERT INTO public.plan_templates (
  name,
  description,
  age_range,
  gender,
  fitness_level,
  days_per_week,
  weeks_duration,
  program_type,
  primary_goal,
  movement_philosophy,
  includes_strength,
  includes_cardio,
  includes_mobility,
  includes_warmup,
  includes_cooldown,
  goals,
  auto_generate_enabled
) VALUES (
  'HYROX 12-Week Race Prep',
  'Complete 12-week HYROX preparation program with Base, Build, Competition, and Taper phases. Combines strength, functional fitness, running, and erg work for optimal hybrid racing performance.',
  '25-45',
  'all',
  'intermediate',
  5,
  12,
  'hybrid_racing',
  'race_performance',
  'Build race-specific strength, power, and endurance through progressive periodization. Emphasizes functional movements, compromised running, and race simulation.',
  true,
  true,
  true,
  true,
  true,
  ARRAY['endurance', 'strength', 'power', 'functional_fitness'],
  false
);

-- Step 2: Define movement requirements for WEEKS 1-4 (BASE PHASE)
-- Focus: High volume endurance, moderate strength (3-5 sets x 10-12 reps)

-- BASE: Upper Push (Weeks 1-4)
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'push',
  2,
  1,
  12,
  4,
  12,
  'RPE 7-8 | 70-75% 1RM | Build muscular endurance',
  90,
  1,
  'Weeks 1-4 BASE: Bench press, overhead press, or machine press. Focus on time under tension and form.'
);

-- BASE: Upper Pull (Weeks 1-4)
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'pull',
  2,
  1,
  12,
  4,
  12,
  'RPE 7-8 | 70-75% 1RM | Essential for sled pull and rower',
  90,
  2,
  'Weeks 1-4 BASE: Rows, lat pulldowns, or pull-ups. Critical for HYROX sled and rower stations.'
);

-- BASE: Lower Squat
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'squat',
  2,
  1,
  12,
  4,
  12,
  'RPE 7-8 | 70-75% 1RM | Build leg endurance for wall balls and lunges',
  90,
  3,
  'BASE Phase: Back squat, front squat, or leg press. Prepares legs for race volume.'
);

-- BASE: Lower Hinge
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'hinge',
  2,
  1,
  10,
  4,
  10,
  'RPE 7-8 | 70-75% 1RM | Posterior chain for sled push power',
  90,
  4,
  'BASE Phase: Deadlifts, RDLs, or hip thrusts. Essential for sled push and overall power.'
);

-- Step 3: WEEKS 5-8 (BUILD PHASE)
-- Focus: Heavy strength and power (4-6 sets x 4-6 reps), more rest, CNS recovery

-- BUILD: Upper Push
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'push',
  2,
  2,
  8,
  5,
  5,
  'RPE 9 | 85-90% 1RM | Build maximal strength',
  180,
  1,
  'BUILD Phase: Heavy compound presses. Increase load significantly, reduce reps.'
);

-- BUILD: Upper Pull
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'pull',
  2,
  2,
  8,
  5,
  5,
  'RPE 9 | 85-90% 1RM | Max strength for sled and rower power',
  180,
  2,
  'BUILD Phase: Heavy rows or weighted pull-ups. Full recovery between sets.'
);

-- BUILD: Lower Squat
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'squat',
  2,
  2,
  8,
  5,
  5,
  'RPE 9 | 85-90% 1RM | Peak leg strength',
  180,
  3,
  'BUILD Phase: Heavy squats. Allow full CNS recovery - keep legs fresh before leg day.'
);

-- BUILD: Lower Hinge
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'hinge',
  2,
  2,
  6,
  5,
  5,
  'RPE 9 | 85-90% 1RM | Maximum posterior power',
  180,
  4,
  'BUILD Phase: Heavy deadlifts or hip thrusts. Critical for sled push power output.'
);

-- Step 4: WEEKS 9-11 (COMPETITION PHASE)
-- Focus: Power, speed, race simulation (3-4 sets x 6-8 reps), explosive work

-- COMPETITION: Upper Push
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'push',
  2,
  1,
  10,
  3,
  8,
  'RPE 8-9 | 75-85% 1RM | Explosive power + speed',
  120,
  1,
  'COMPETITION Phase: Maintain strength, add explosive variations (push-ups, dips). Focus on speed.'
);

-- COMPETITION: Upper Pull
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'pull',
  2,
  1,
  10,
  3,
  8,
  'RPE 8-9 | 75-85% 1RM | Race-specific pulling power',
  120,
  2,
  'COMPETITION Phase: Emphasize pull-up variations, fast rows. Mimic race intensity.'
);

-- COMPETITION: Lower Squat
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'squat',
  2,
  1,
  10,
  3,
  8,
  'RPE 8-9 | 75-85% 1RM | Power endurance for wall balls',
  120,
  3,
  'COMPETITION Phase: Thrusters, jump squats, explosive squats. Add race-specific variations.'
);

-- COMPETITION: Lower Hinge
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'hinge',
  2,
  1,
  8,
  3,
  8,
  'RPE 8-9 | 75-85% 1RM | Explosive hip power',
  120,
  4,
  'COMPETITION Phase: Power cleans, sled push drills, explosive RDLs. Race simulation focus.'
);

-- Step 5: WEEK 12 (TAPER)
-- Focus: Recovery, maintain, low volume/intensity (2 sets x 8-10 reps)

-- TAPER: Light Upper
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'push',
  1,
  1,
  12,
  2,
  10,
  'RPE 5-6 | 60% 1RM | Light maintenance only',
  60,
  1,
  'TAPER Week: Very light, non-taxing. Focus on staying loose and mentally ready.'
);

INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'pull',
  1,
  1,
  12,
  2,
  10,
  'RPE 5-6 | 60% 1RM | Light maintenance only',
  60,
  2,
  'TAPER Week: Keep movements smooth and controlled. No red zone work.'
);

-- TAPER: Light Lower
INSERT INTO public.template_movement_requirements (
  template_id,
  movement_pattern,
  frequency_per_week,
  warmup_sets,
  warmup_reps,
  working_sets,
  working_reps,
  intensity_guideline,
  rest_seconds,
  priority_order,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'squat',
  1,
  1,
  12,
  2,
  10,
  'RPE 5-6 | 60% 1RM | Recovery mode',
  60,
  3,
  'TAPER Week: Bodyweight or very light. Easy yoga/mobility preferred.'
);

-- Step 6: Add Split Logic for weekly structure
INSERT INTO public.template_split_logic (
  template_id,
  split_type,
  days_per_week,
  weekly_structure,
  progression_scheme,
  notes
) VALUES (
  (SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1),
  'hybrid_racing',
  5,
  '{
    "week_pattern": [
      {"day": 1, "workout_type": "strength_upper", "focus": ["push", "pull"], "notes": "Mon: Upper Push + Pull. 30 min strength, 20 min functional"},
      {"day": 2, "workout_type": "strength_lower", "focus": ["squat", "hinge"], "notes": "Tue: Lower Squat + Hinge. Add core work at end"},
      {"day": 3, "workout_type": "active_recovery", "focus": ["mobility"], "notes": "Wed: Active recovery - walk/stretch/foam roll only"},
      {"day": 4, "workout_type": "functional", "focus": ["carry", "core"], "notes": "Thu: Functional fitness circuit + light upper"},
      {"day": 5, "workout_type": "endurance", "focus": ["cardio"], "notes": "Fri: 30-90 min Z2-Z3 run or erg. 5 min mobility warmup, 10 min cooldown"},
      {"day": 6, "rest": true, "notes": "Sat: Complete rest"},
      {"day": 7, "workout_type": "intervals", "focus": ["running"], "notes": "Sun: Running intervals Z2-Z3. 5 min agility drills first"}
    ]
  }'::jsonb,
  'block_periodization',
  '5 sessions per week: Mon/Tue strength, Wed recovery, Thu functional, Fri/Sun cardio. Keep legs fresh before leg day and sprints.'
);

-- Step 7: Add Validation Rules
INSERT INTO public.template_rules (
  template_id,
  rule_type,
  rule_description,
  validation_logic,
  priority,
  warning_message
) VALUES
  ((SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1), 'volume', 'Session duration limit', '{"max_minutes": 90}'::jsonb, 'recommended', 'Sessions should not exceed 90 minutes'),
  ((SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1), 'frequency', 'Leg day recovery requirement', '{"after_pattern": "squat", "rest_hours": 48}'::jsonb, 'required', 'Keep legs fresh - minimum 48h rest after leg day before sprints'),
  ((SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1), 'custom', 'Build phase CNS recovery', '{"weeks_5_8": "heavy_strength", "rest_importance": "critical"}'::jsonb, 'recommended', 'Weeks 5-8: CNS recovery critical - ensure adequate rest between sessions'),
  ((SELECT id FROM public.plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1), 'volume', 'Taper week volume restriction', '{"week_12": "low_volume", "intensity": "low"}'::jsonb, 'required', 'Taper week: Low volume, low intensity. No contact sports or high-risk activities');

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ HYROX 12-Week Race Prep template created successfully!';
  RAISE NOTICE '📊 Includes: 4 phases (Base/Build/Competition/Taper)';
  RAISE NOTICE '💪 Movement patterns: Push, Pull, Squat, Hinge per phase';
  RAISE NOTICE '📅 Weekly structure: 5 sessions (2 Upper, 2 Lower, 1-2 Cardio)';
  RAISE NOTICE '🎯 Ready to generate client plans with proper periodization';
END $$;

