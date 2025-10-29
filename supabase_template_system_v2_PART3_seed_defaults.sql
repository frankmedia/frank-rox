-- =====================================================
-- TEMPLATE SYSTEM V2 - PART 3: SEED DEFAULT VALUES
-- =====================================================
-- Populates the day_type_defaults matrix with sensible defaults
-- Based on spec Section 7: Defaults Matrix

-- =====================================================
-- STRENGTH DAY DEFAULTS
-- =====================================================

INSERT INTO public.day_type_defaults (day_type, block_type, default_sets, default_reps, default_time_seconds, default_rest_seconds, default_intensity, notes) VALUES
-- Strength: WarmUp
('Strength', 'WarmUp', 1, NULL, 300, 0, NULL, '5 min general warm-up'),
-- Strength: Mobility
('Strength', 'Mobility', 2, NULL, 60, 30, NULL, '2 rounds × 60s holds'),
-- Strength: Main Lifts
('Strength', 'UpperBody', 5, 5, NULL, 120, '{"percent1RM": 75}'::jsonb, 'Heavy compound push/pull'),
('Strength', 'LowerBody', 5, 5, NULL, 150, '{"percent1RM": 75}'::jsonb, 'Heavy compound legs'),
('Strength', 'Squat', 5, 5, NULL, 150, '{"percent1RM": 75}'::jsonb, 'Squat emphasis'),
('Strength', 'Hinge', 5, 5, NULL, 150, '{"percent1RM": 75}'::jsonb, 'Deadlift/RDL emphasis'),
('Strength', 'Push', 5, 5, NULL, 120, '{"percent1RM": 75}'::jsonb, 'Push emphasis'),
('Strength', 'Pull', 5, 5, NULL, 120, '{"percent1RM": 75}'::jsonb, 'Pull emphasis'),
-- Strength: Accessories
('Strength', 'Accessory', 3, 12, NULL, 60, '{"rpe": 7}'::jsonb, 'Hypertrophy range'),
('Strength', 'Core', 3, 15, NULL, 45, '{"rpe": 7}'::jsonb, 'Core stability'),
-- Strength: Cooldown
('Strength', 'Stretch', 2, NULL, 45, 15, NULL, 'Static stretches'),
('Strength', 'Cooldown', 1, NULL, 300, 0, NULL, '5 min easy movement');

-- =====================================================
-- MOBILITY DAY DEFAULTS
-- =====================================================

INSERT INTO public.day_type_defaults (day_type, block_type, default_sets, default_reps, default_time_seconds, default_rest_seconds, default_intensity, notes) VALUES
('Mobility', 'WarmUp', 1, NULL, 180, 0, NULL, '3 min light cardio'),
('Mobility', 'Mobility', 3, NULL, 45, 30, NULL, 'Flow patterns'),
('Mobility', 'Stretch', 3, NULL, 45, 15, NULL, 'Deep stretching'),
('Mobility', 'Core', 2, 10, NULL, 30, '{"rpe": 5}'::jsonb, 'Light core activation'),
('Mobility', 'Cooldown', 1, NULL, 300, 0, NULL, 'Breathwork/relaxation');

-- =====================================================
-- CONSOLIDATION DAY DEFAULTS (technique/skill work)
-- =====================================================

INSERT INTO public.day_type_defaults (day_type, block_type, default_sets, default_reps, default_time_seconds, default_rest_seconds, default_intensity, notes) VALUES
('Consolidation', 'WarmUp', 1, NULL, 300, 0, NULL, '5 min prep'),
('Consolidation', 'Technique', 3, 3, NULL, 90, '{"rpe": 6}'::jsonb, 'Perfect form, light load'),
('Consolidation', 'Core', 3, 12, NULL, 45, '{"rpe": 6}'::jsonb, 'Core endurance'),
('Consolidation', 'Accessory', 2, 15, NULL, 45, '{"rpe": 6}'::jsonb, 'Light pump work'),
('Consolidation', 'Stretch', 3, NULL, 60, 20, NULL, 'Extended stretching'),
('Consolidation', 'Cooldown', 1, NULL, 300, 0, NULL, 'Light movement');

-- =====================================================
-- HEAT DAY DEFAULTS (HIIT/MetCon)
-- =====================================================

INSERT INTO public.day_type_defaults (day_type, block_type, default_sets, default_reps, default_time_seconds, default_rest_seconds, default_intensity, notes) VALUES
('Heat', 'WarmUp', 1, NULL, 600, 0, '{"rpe": 5}'::jsonb, '10 min build-up'),
('Heat', 'Conditioning', 6, NULL, 60, 60, '{"rpe": 8}'::jsonb, 'Work/rest intervals'),
('Heat', 'Finisher', 3, NULL, 90, 90, '{"rpe": 9}'::jsonb, 'Max effort circuits'),
('Heat', 'Stretch', 2, NULL, 60, 30, NULL, 'Cool-down stretches'),
('Heat', 'Cooldown', 1, NULL, 300, 0, NULL, 'Walk down');

-- =====================================================
-- RECOVERY DAY DEFAULTS
-- =====================================================

INSERT INTO public.day_type_defaults (day_type, block_type, default_sets, default_reps, default_time_seconds, default_rest_seconds, default_intensity, notes) VALUES
('Recovery', 'WarmUp', 1, NULL, 300, 0, NULL, 'Gentle movement'),
('Recovery', 'Mobility', 2, NULL, 90, 45, NULL, 'Restorative flows'),
('Recovery', 'Stretch', 4, NULL, 60, 30, NULL, 'Extended static holds'),
('Recovery', 'Core', 2, 8, NULL, 60, '{"rpe": 4}'::jsonb, 'Very light activation'),
('Recovery', 'Cooldown', 1, NULL, 600, 0, NULL, '10 min relaxation');

-- =====================================================
-- TECHNIQUE DAY DEFAULTS
-- =====================================================

INSERT INTO public.day_type_defaults (day_type, block_type, default_sets, default_reps, default_time_seconds, default_rest_seconds, default_intensity, notes) VALUES
('Technique', 'WarmUp', 1, NULL, 300, 0, NULL, 'Movement prep'),
('Technique', 'Technique', 5, 3, NULL, 120, '{"rpe": 5}'::jsonb, 'Skill development'),
('Technique', 'Core', 3, 10, NULL, 45, '{"rpe": 6}'::jsonb, 'Stability work'),
('Technique', 'Stretch', 2, NULL, 45, 20, NULL, 'Light stretching'),
('Technique', 'Cooldown', 1, NULL, 300, 0, NULL, 'Easy movement');

-- =====================================================
-- CUSTOM DAY DEFAULTS (fallback)
-- =====================================================

INSERT INTO public.day_type_defaults (day_type, block_type, default_sets, default_reps, default_time_seconds, default_rest_seconds, default_intensity, notes) VALUES
('Custom', 'WarmUp', 1, NULL, 300, 0, NULL, 'Standard warm-up'),
('Custom', 'Mobility', 2, NULL, 60, 30, NULL, 'Standard mobility'),
('Custom', 'UpperBody', 4, 8, NULL, 90, '{"rpe": 7}'::jsonb, 'Standard upper'),
('Custom', 'LowerBody', 4, 8, NULL, 90, '{"rpe": 7}'::jsonb, 'Standard lower'),
('Custom', 'Squat', 4, 8, NULL, 90, '{"rpe": 7}'::jsonb, 'Standard squat'),
('Custom', 'Hinge', 4, 8, NULL, 90, '{"rpe": 7}'::jsonb, 'Standard hinge'),
('Custom', 'Push', 4, 8, NULL, 90, '{"rpe": 7}'::jsonb, 'Standard push'),
('Custom', 'Pull', 4, 8, NULL, 90, '{"rpe": 7}'::jsonb, 'Standard pull'),
('Custom', 'Core', 3, 12, NULL, 45, '{"rpe": 7}'::jsonb, 'Standard core'),
('Custom', 'Conditioning', 4, NULL, 60, 60, '{"rpe": 7}'::jsonb, 'Standard conditioning'),
('Custom', 'Accessory', 3, 12, NULL, 60, '{"rpe": 7}'::jsonb, 'Standard accessory'),
('Custom', 'Finisher', 3, NULL, 60, 60, '{"rpe": 8}'::jsonb, 'Standard finisher'),
('Custom', 'Stretch', 2, NULL, 45, 15, NULL, 'Standard stretch'),
('Custom', 'Cooldown', 1, NULL, 300, 0, NULL, 'Standard cooldown'),
('Custom', 'Technique', 3, 5, NULL, 90, '{"rpe": 6}'::jsonb, 'Standard technique');

-- Success message
DO $$
DECLARE
  row_count INT;
BEGIN
  SELECT COUNT(*) INTO row_count FROM public.day_type_defaults;
  RAISE NOTICE '✅ Seeded % default prescription rules', row_count;
  RAISE NOTICE '📊 Defaults matrix: 7 day types × multiple block types';
  RAISE NOTICE '🎯 Ready for template creation';
END $$;

