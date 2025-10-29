-- =====================================================
-- ADVANCED TEMPLATE SYSTEM - DATABASE MIGRATION
-- =====================================================
-- This migration adds support for movement-based programming,
-- workout structures, and exercise selection rules.

-- =====================================================
-- STEP 1: Update exercises table with movement patterns
-- =====================================================

-- Add movement pattern and biomechanics columns to exercises
ALTER TABLE public.exercises
ADD COLUMN IF NOT EXISTS movement_pattern TEXT,
ADD COLUMN IF NOT EXISTS plane_of_motion TEXT,
ADD COLUMN IF NOT EXISTS primary_muscle_group TEXT,
ADD COLUMN IF NOT EXISTS secondary_muscle_groups TEXT[],
ADD COLUMN IF NOT EXISTS equipment_category TEXT,
ADD COLUMN IF NOT EXISTS exercise_complexity TEXT; -- 'beginner', 'intermediate', 'advanced'

-- Add comments for clarity
COMMENT ON COLUMN public.exercises.movement_pattern IS 'Primary movement: squat, hinge, push, pull, carry, rotation, isolation, etc.';
COMMENT ON COLUMN public.exercises.plane_of_motion IS 'Primary plane: sagittal, frontal, transverse';
COMMENT ON COLUMN public.exercises.primary_muscle_group IS 'Main target: glutes, quads, hamstrings, chest, back, shoulders, etc.';
COMMENT ON COLUMN public.exercises.secondary_muscle_groups IS 'Secondary muscles worked';
COMMENT ON COLUMN public.exercises.equipment_category IS 'machine, barbell, dumbbell, kettlebell, bodyweight, cable, etc.';
COMMENT ON COLUMN public.exercises.exercise_complexity IS 'Skill level required';

-- =====================================================
-- STEP 2: Create template_movement_requirements table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.template_movement_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES public.plan_templates(id) ON DELETE CASCADE,
  
  -- Movement pattern requirements
  movement_pattern TEXT NOT NULL, -- 'squat', 'hinge', 'push', 'pull', etc.
  frequency_per_week INT NOT NULL DEFAULT 1, -- How many times this movement should appear per week
  frequency_per_workout INT, -- How many times per individual workout (optional)
  
  -- Set/Rep scheme
  warmup_sets INT DEFAULT 0,
  warmup_reps INT DEFAULT 0,
  working_sets INT NOT NULL DEFAULT 3,
  working_reps INT NOT NULL DEFAULT 10,
  reps_range_min INT, -- e.g., 8-12 reps
  reps_range_max INT,
  
  -- Intensity
  intensity_guideline TEXT, -- 'near_fatigue', 'to_failure', 'RPE_7', 'RPE_8', '70%_1RM', etc.
  rest_seconds INT DEFAULT 60,
  
  -- Priority and placement
  priority_order INT DEFAULT 1, -- Order within workout (1 = first, 2 = second, etc.)
  placement_rule TEXT, -- 'start_of_workout', 'mid_workout', 'end_of_workout', 'finisher'
  
  -- Exercise selection rules
  allowed_equipment TEXT[], -- Filter exercises by equipment
  complexity_level TEXT, -- 'beginner', 'intermediate', 'advanced'
  specific_muscle_focus TEXT, -- For specialization (e.g., 'glutes' for glute program)
  
  -- Notes
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_template_movement_requirements_template ON public.template_movement_requirements(template_id);

COMMENT ON TABLE public.template_movement_requirements IS 'Defines movement pattern requirements for each template';

-- =====================================================
-- STEP 3: Create template_workout_structures table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.template_workout_structures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES public.plan_templates(id) ON DELETE CASCADE,
  
  -- Workout definition
  workout_name TEXT NOT NULL, -- 'Day 1: Full Body', 'Upper Push', 'Lower Squat Focused', etc.
  workout_type TEXT, -- 'full_body', 'upper_push', 'upper_pull', 'lower_squat', 'lower_hinge', etc.
  day_in_cycle INT, -- Which day in the weekly cycle (1-7)
  week_frequency INT DEFAULT 1, -- How many times this workout appears per week
  
  -- Workout structure (JSON with slots)
  structure_data JSONB, -- Defines the workout blueprint
  /* Example structure_data:
  {
    "slots": [
      {
        "slot_number": 1,
        "movement_pattern": "squat",
        "sets": 4,
        "reps": 12,
        "warmup_sets": 2,
        "notes": "Focus on depth and control"
      },
      {
        "slot_number": 2,
        "movement_pattern": "hinge",
        "sets": 4,
        "reps": 12,
        "notes": "Hip thrust or RDL"
      }
    ]
  }
  */
  
  -- Metadata
  estimated_duration_minutes INT,
  difficulty_level TEXT, -- 'easy', 'moderate', 'hard', 'brutal'
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_template_workout_structures_template ON public.template_workout_structures(template_id);

COMMENT ON TABLE public.template_workout_structures IS 'Defines workout day structures/blueprints for templates';

-- =====================================================
-- STEP 4: Create template_split_logic table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.template_split_logic (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES public.plan_templates(id) ON DELETE CASCADE,
  
  -- Split configuration
  split_type TEXT NOT NULL, -- 'full_body', 'upper_lower', 'push_pull_legs', 'bro_split', 'custom'
  days_per_week INT NOT NULL,
  
  -- Weekly structure (JSON)
  weekly_structure JSONB, -- Defines which workout types on which days
  /* Example weekly_structure:
  {
    "week_pattern": [
      {"day": 1, "workout_type": "full_body", "focus": "squat_hinge"},
      {"day": 3, "workout_type": "full_body", "focus": "push_pull"},
      {"day": 5, "workout_type": "full_body", "focus": "squat_hinge"},
      {"day": 7, "rest": true}
    ]
  }
  */
  
  -- Progression rules
  progression_scheme TEXT, -- 'linear', 'wave', 'undulating', 'block_periodization'
  deload_frequency INT, -- Every X weeks
  
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_template_split_logic_template ON public.template_split_logic(template_id);

COMMENT ON TABLE public.template_split_logic IS 'Defines training split logic and weekly structure';

-- =====================================================
-- STEP 5: Update plan_templates table with new fields
-- =====================================================

ALTER TABLE public.plan_templates
ADD COLUMN IF NOT EXISTS program_type TEXT, -- 'strength_focused', 'hypertrophy', 'endurance', 'hyrox', 'glute_specialization', etc.
ADD COLUMN IF NOT EXISTS primary_goal TEXT, -- 'muscle_gain', 'fat_loss', 'performance', 'general_fitness'
ADD COLUMN IF NOT EXISTS movement_philosophy TEXT, -- 'movement_patterns', 'muscle_groups', 'hybrid'
ADD COLUMN IF NOT EXISTS auto_generate_enabled BOOLEAN DEFAULT false, -- Can this template auto-generate workouts?
ADD COLUMN IF NOT EXISTS requires_manual_selection BOOLEAN DEFAULT true; -- Does PT need to pick exercises manually?

COMMENT ON COLUMN public.plan_templates.program_type IS 'Type of training program';
COMMENT ON COLUMN public.plan_templates.movement_philosophy IS 'Programming approach: movement patterns vs muscle groups';
COMMENT ON COLUMN public.plan_templates.auto_generate_enabled IS 'Can system auto-select exercises based on rules?';

-- =====================================================
-- STEP 6: Create template_rules table (for validation)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.template_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID REFERENCES public.plan_templates(id) ON DELETE CASCADE,
  
  -- Rule definition
  rule_type TEXT NOT NULL, -- 'movement_coverage', 'plane_coverage', 'frequency', 'volume', 'custom'
  rule_description TEXT NOT NULL,
  validation_logic JSONB, -- Stores the validation criteria
  /* Example validation_logic:
  {
    "type": "movement_coverage",
    "requirements": {
      "squat": {"min": 1, "max": 3},
      "hinge": {"min": 1, "max": 3},
      "push": {"min": 2, "max": 4},
      "pull": {"min": 2, "max": 4}
    },
    "scope": "per_week"
  }
  */
  
  priority TEXT DEFAULT 'required', -- 'required', 'recommended', 'optional'
  warning_message TEXT, -- Message to show if rule is violated
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_template_rules_template ON public.template_rules(template_id);

COMMENT ON TABLE public.template_rules IS 'Validation rules for template-based plans';

-- =====================================================
-- Display summary
-- =====================================================

DO $$ 
BEGIN
  RAISE NOTICE '✅ Advanced Template System migration complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'New tables created:';
  RAISE NOTICE '  - template_movement_requirements';
  RAISE NOTICE '  - template_workout_structures';
  RAISE NOTICE '  - template_split_logic';
  RAISE NOTICE '  - template_rules';
  RAISE NOTICE '';
  RAISE NOTICE 'Updated tables:';
  RAISE NOTICE '  - exercises (added movement patterns, planes, muscle groups)';
  RAISE NOTICE '  - plan_templates (added program types, philosophy)';
END $$;

