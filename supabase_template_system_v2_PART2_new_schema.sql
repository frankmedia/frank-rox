-- =====================================================
-- TEMPLATE SYSTEM V2 - PART 2: NEW SCHEMA
-- =====================================================
-- Based on PT Web App Technical Spec
-- Creates template-driven program generation system

-- =====================================================
-- ENUMS
-- =====================================================

-- Day Type: What kind of training day
CREATE TYPE day_type AS ENUM (
  'Strength',
  'Mobility', 
  'Consolidation',
  'Heat',
  'Recovery',
  'Technique',
  'Custom'
);

-- Block Type: Section within a training day
CREATE TYPE block_type AS ENUM (
  'WarmUp',
  'Mobility',
  'Stretch',
  'UpperBody',
  'LowerBody',
  'Squat',
  'Hinge',
  'Push',
  'Pull',
  'Core',
  'Conditioning',
  'Accessory',
  'Finisher',
  'Cooldown',
  'Technique',
  'Custom'
);

-- Mobility Category: Biases exercise selection
CREATE TYPE mobility_category AS ENUM (
  'Push',
  'Pull',
  'Legs'
);

-- Prescription Source: Where sets/reps come from
CREATE TYPE prescription_source AS ENUM (
  'Explicit',
  'FromDayTypeDefaults'
);

-- Program Instance Status
CREATE TYPE program_status AS ENUM (
  'Draft',
  'Active',
  'Archived'
);

-- =====================================================
-- CORE TEMPLATE TABLES
-- =====================================================

-- ProgramTemplate: Reusable weekly blueprint
CREATE TABLE public.program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  days_per_week INT NOT NULL CHECK (days_per_week BETWEEN 1 AND 7),
  notes TEXT,
  version INT NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by TEXT, -- PT username
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- DayTemplate: One day in the weekly template
CREATE TABLE public.day_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_template_id UUID NOT NULL REFERENCES public.program_templates(id) ON DELETE CASCADE,
  day_index INT NOT NULL CHECK (day_index >= 1), -- 1..days_per_week
  weekday_hint TEXT, -- 'Mon', 'Tue', etc. (optional scheduling preference)
  day_type day_type NOT NULL,
  mobility_category mobility_category, -- nullable
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_template_id, day_index)
);

-- Block: Logical section within a DayTemplate
CREATE TABLE public.blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_template_id UUID NOT NULL REFERENCES public.day_templates(id) ON DELETE CASCADE,
  order_index INT NOT NULL CHECK (order_index >= 1),
  block_type block_type NOT NULL,
  title TEXT, -- optional override
  use_day_type_defaults BOOLEAN NOT NULL DEFAULT true,
  intensity_rpe DECIMAL(3,1), -- nullable, e.g. 7.5
  rest_seconds_default INT, -- nullable
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(day_template_id, order_index)
);

-- BlockExercise: Reference to exercise with prescription
CREATE TABLE public.block_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_id UUID NOT NULL REFERENCES public.blocks(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  order_index INT NOT NULL CHECK (order_index >= 1),
  sets INT, -- nullable if using defaults
  reps INT, -- nullable
  time_seconds INT, -- nullable
  tempo TEXT, -- e.g. "3010"
  rest_seconds INT, -- nullable
  intensity JSONB, -- e.g. {"rpe": 7.5, "percent1RM": 70}
  prescription_source prescription_source NOT NULL DEFAULT 'Explicit',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(block_id, order_index)
);

-- =====================================================
-- DEFAULTS & RULES
-- =====================================================

-- DayTypeDefaults: Default prescriptions by day_type × block_type
CREATE TABLE public.day_type_defaults (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_type day_type NOT NULL,
  block_type block_type NOT NULL,
  default_sets INT NOT NULL,
  default_reps INT, -- nullable (for time-based)
  default_time_seconds INT, -- nullable (for rep-based)
  default_rest_seconds INT NOT NULL,
  default_intensity JSONB, -- e.g. {"percent1RM": 75} or {"rpe": 7}
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(day_type, block_type)
);

-- =====================================================
-- EXERCISE POOLS (for automatic selection)
-- =====================================================

-- ExercisePool: Named filter for exercises
CREATE TABLE public.exercise_pools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL UNIQUE,
  filters JSONB NOT NULL, -- e.g. {"include_tags":["push","mobility"],"exclude_tags":["barbell"]}
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Link pools to day templates (with optional block specificity)
CREATE TABLE public.day_template_exercise_pool_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_template_id UUID NOT NULL REFERENCES public.day_templates(id) ON DELETE CASCADE,
  block_id UUID REFERENCES public.blocks(id) ON DELETE CASCADE, -- nullable: pool applies to entire day
  exercise_pool_id UUID NOT NULL REFERENCES public.exercise_pools(id) ON DELETE CASCADE,
  priority INT NOT NULL DEFAULT 1, -- higher = use first
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- GENERATED PROGRAM INSTANCES (immutable history)
-- =====================================================

-- ProgramInstance: Athlete-specific generated plan
CREATE TABLE public.program_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_template_id UUID NOT NULL REFERENCES public.program_templates(id) ON DELETE RESTRICT,
  athlete_id BIGINT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  start_date DATE NOT NULL,
  weeks INT NOT NULL CHECK (weeks >= 1),
  status program_status NOT NULL DEFAULT 'Draft',
  snapshot_version INT NOT NULL, -- template version at generation time
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ProgramDay: One day in the generated instance
CREATE TABLE public.program_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_instance_id UUID NOT NULL REFERENCES public.program_instances(id) ON DELETE CASCADE,
  calendar_date DATE NOT NULL,
  day_index INT NOT NULL, -- 1..days_per_week
  day_type day_type NOT NULL,
  mobility_category mobility_category, -- nullable
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_instance_id, calendar_date)
);

-- ProgramBlock: One block in a generated day
CREATE TABLE public.program_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_day_id UUID NOT NULL REFERENCES public.program_days(id) ON DELETE CASCADE,
  order_index INT NOT NULL CHECK (order_index >= 1),
  block_type block_type NOT NULL,
  title TEXT NOT NULL,
  intensity_rpe DECIMAL(3,1), -- nullable
  rest_seconds_default INT, -- nullable
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_day_id, order_index)
);

-- ProgramExercise: One exercise in a generated block (fully resolved)
CREATE TABLE public.program_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_block_id UUID NOT NULL REFERENCES public.program_blocks(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE RESTRICT,
  order_index INT NOT NULL CHECK (order_index >= 1),
  sets INT NOT NULL,
  reps INT, -- nullable if time-based
  time_seconds INT, -- nullable if rep-based
  tempo TEXT,
  rest_seconds INT NOT NULL,
  intensity JSONB,
  source_info JSONB, -- e.g. {"from_block_exercise_id":"...", "rules":[...]}
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(program_block_id, order_index)
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_day_templates_program ON public.day_templates(program_template_id);
CREATE INDEX idx_blocks_day_template ON public.blocks(day_template_id);
CREATE INDEX idx_block_exercises_block ON public.block_exercises(block_id);
CREATE INDEX idx_block_exercises_exercise ON public.block_exercises(exercise_id);
CREATE INDEX idx_pool_links_day ON public.day_template_exercise_pool_links(day_template_id);
CREATE INDEX idx_pool_links_pool ON public.day_template_exercise_pool_links(exercise_pool_id);
CREATE INDEX idx_program_instances_template ON public.program_instances(program_template_id);
CREATE INDEX idx_program_instances_athlete ON public.program_instances(athlete_id);
CREATE INDEX idx_program_days_instance ON public.program_days(program_instance_id);
CREATE INDEX idx_program_days_date ON public.program_days(calendar_date);
CREATE INDEX idx_program_blocks_day ON public.program_blocks(program_day_id);
CREATE INDEX idx_program_exercises_block ON public.program_exercises(program_block_id);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE public.program_templates IS 'Reusable weekly training blueprints';
COMMENT ON TABLE public.day_templates IS 'Individual day configuration within a template';
COMMENT ON TABLE public.blocks IS 'Logical sections within a training day (WarmUp, Main Lift, etc.)';
COMMENT ON TABLE public.block_exercises IS 'Exercises within a block with prescriptions';
COMMENT ON TABLE public.day_type_defaults IS 'Default sets/reps/intensity by (day_type, block_type)';
COMMENT ON TABLE public.exercise_pools IS 'Filtered collections of exercises for automatic selection';
COMMENT ON TABLE public.program_instances IS 'Athlete-specific generated plans (immutable snapshots)';
COMMENT ON TABLE public.program_days IS 'Generated days with resolved exercises and prescriptions';

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ New template system V2 schema created successfully!';
  RAISE NOTICE '📋 Tables: program_templates, day_templates, blocks, block_exercises';
  RAISE NOTICE '📋 Tables: day_type_defaults, exercise_pools, pool_links';
  RAISE NOTICE '📋 Tables: program_instances, program_days, program_blocks, program_exercises';
  RAISE NOTICE '🎯 Ready to seed defaults and build UI';
END $$;

