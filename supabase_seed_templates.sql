-- Seed data: 5 Initial Base Templates
-- Run this after the plan_templates table migration

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
  template_data,
  created_by,
  is_public
) VALUES

-- 1. Beginner Full Body (25-30, 3x/week)
(
  'Beginner Full Body 3x/Week',
  'Perfect for those new to structured training. Full-body workouts with emphasis on form and building foundational strength.',
  '25-30',
  'any',
  'beginner',
  ARRAY['general-fitness', 'strength', 'muscle-gain'],
  3,
  8,
  false,
  true,
  true,
  true,
  true,
  ARRAY['machines', 'bodyweight', 'cardio-equipment'],
  '{}',
  'admin',
  true
),

-- 2. Intermediate Push/Pull Split (30-35, 4x/week)
(
  'Intermediate Push/Pull 4x/Week',
  'Classic push/pull split for intermediate lifters. Balanced approach to building strength and muscle.',
  '30-35',
  'any',
  'intermediate',
  ARRAY['strength', 'muscle-gain', 'general-fitness'],
  4,
  8,
  false,
  true,
  false,
  true,
  true,
  ARRAY['machines', 'free-weights'],
  '{}',
  'admin',
  true
),

-- 3. Advanced Strength + Cardio (35-40, 5x/week)
(
  'Advanced Strength + Cardio Mix',
  'Comprehensive program combining heavy strength training with strategic cardio for overall fitness and body composition.',
  '35-40',
  'any',
  'advanced',
  ARRAY['strength', 'endurance', 'weight-loss', 'general-fitness'],
  5,
  12,
  true,
  true,
  true,
  true,
  true,
  ARRAY['machines', 'free-weights', 'cardio-equipment'],
  '{}',
  'admin',
  true
),

-- 4. Endurance & Conditioning Focus (40-45, 4x/week)
(
  'Endurance & Conditioning 4x/Week',
  'Emphasis on cardiovascular endurance and functional strength. Great for active lifestyle maintenance.',
  '40-45',
  'any',
  'intermediate',
  ARRAY['endurance', 'cardio', 'general-fitness', 'weight-loss'],
  4,
  8,
  true,
  true,
  true,
  true,
  true,
  ARRAY['machines', 'bodyweight', 'cardio-equipment'],
  '{}',
  'admin',
  true
),

-- 5. Hyrox Competition Prep (30-35, 6x/week)
(
  'Hyrox Competition Prep',
  'Intensive Hyrox-specific training combining strength, endurance, and skill work. For serious competitors.',
  '30-35',
  'any',
  'advanced',
  ARRAY['hyrox', 'endurance', 'strength'],
  6,
  12,
  true,
  true,
  true,
  true,
  true,
  ARRAY['machines', 'free-weights', 'cardio-equipment', 'kettlebells'],
  '{}',
  'admin',
  true
);

-- Display confirmation
SELECT 
  name, 
  age_range, 
  fitness_level, 
  days_per_week 
FROM public.plan_templates 
ORDER BY created_at DESC 
LIMIT 5;


