-- Migration: Plan Templates System
-- Description: Add tables for storing plan templates and client preferences

-- Plan Templates table
CREATE TABLE IF NOT EXISTS public.plan_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  age_range TEXT, -- '20-25', '25-30', '30-35', '35-40', '40-45', '45-50', '50-55', '55-60', '60-65', '65+'
  gender TEXT, -- 'male', 'female', 'any'
  fitness_level TEXT, -- 'beginner', 'intermediate', 'advanced', 'elite'
  goals TEXT[], -- ['strength', 'cardio', 'weight-loss', 'muscle-gain', 'endurance', 'hyrox']
  days_per_week INT,
  weeks_duration INT, -- Program length
  includes_cardio BOOLEAN DEFAULT false,
  includes_strength BOOLEAN DEFAULT false,
  includes_mobility BOOLEAN DEFAULT false,
  includes_warmup BOOLEAN DEFAULT false,
  includes_cooldown BOOLEAN DEFAULT false,
  equipment_needed TEXT[], -- ['machines', 'free-weights', 'bodyweight', 'kettlebells', 'cardio-equipment']
  template_data JSONB, -- Full plan structure (days, exercises, etc.)
  created_by TEXT, -- Username of PT who created it
  is_public BOOLEAN DEFAULT false, -- Share with other PTs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Preferences table (from questionnaire)
CREATE TABLE IF NOT EXISTS public.client_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id BIGINT REFERENCES public.clients(id) ON DELETE CASCADE,
  
  -- Demographics
  age INT,
  gender TEXT,
  fitness_level TEXT,
  
  -- Goals
  primary_goal TEXT,
  secondary_goals TEXT[],
  
  -- Schedule
  days_per_week INT,
  session_duration_min INT,
  preferred_days TEXT[], -- ['monday', 'wednesday', 'friday']
  time_of_day TEXT, -- 'morning', 'afternoon', 'evening'
  
  -- Cardio preferences
  include_cardio BOOLEAN,
  cardio_frequency INT,
  cardio_types TEXT[], -- ['running', 'cycling', 'rowing', 'ski-erg', 'stairmaster']
  cardio_location TEXT, -- 'treadmill', 'outdoor', 'both'
  cardio_intensity TEXT, -- 'z2', 'z3', 'z4', 'mixed'
  
  -- Strength preferences
  include_strength BOOLEAN,
  strength_frequency INT,
  strength_focus TEXT[], -- ['upper', 'lower', 'full-body', 'push-pull']
  equipment_available TEXT[],
  rep_range TEXT, -- 'strength', 'hypertrophy', 'endurance', 'mixed'
  
  -- Mobility & Recovery
  include_warmup BOOLEAN,
  warmup_duration_min INT,
  include_cooldown BOOLEAN,
  cooldown_duration_min INT,
  include_mobility BOOLEAN,
  include_foam_rolling BOOLEAN,
  
  -- Specialized
  include_hiit BOOLEAN,
  hiit_frequency INT,
  include_circuits BOOLEAN,
  include_core BOOLEAN,
  core_frequency TEXT, -- 'every-session', '2-3x-week', 'separate-days'
  include_plyometrics BOOLEAN,
  sport_specific TEXT, -- 'hyrox', 'ocr', 'triathlon', 'general'
  
  -- Progression
  program_length_weeks INT,
  progression_style TEXT, -- 'linear', 'undulating', 'block'
  include_deload BOOLEAN,
  deload_frequency_weeks INT,
  
  -- Constraints
  injuries_limitations TEXT,
  training_history TEXT,
  
  -- Metadata
  questionnaire_version TEXT DEFAULT 'v1',
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_plan_templates_age_range ON public.plan_templates(age_range);
CREATE INDEX IF NOT EXISTS idx_plan_templates_fitness_level ON public.plan_templates(fitness_level);
CREATE INDEX IF NOT EXISTS idx_plan_templates_days_per_week ON public.plan_templates(days_per_week);
CREATE INDEX IF NOT EXISTS idx_plan_templates_is_public ON public.plan_templates(is_public);
CREATE INDEX IF NOT EXISTS idx_client_preferences_client_id ON public.client_preferences(client_id);

-- Add comments for documentation
COMMENT ON TABLE public.plan_templates IS 'Pre-built workout plan templates for quick client setup';
COMMENT ON TABLE public.client_preferences IS 'Client questionnaire responses and training preferences';
COMMENT ON COLUMN public.plan_templates.template_data IS 'Full plan structure in JSON format (days, sessions, exercises)';
COMMENT ON COLUMN public.client_preferences.questionnaire_version IS 'Version of questionnaire used (for future updates)';

-- Note: RLS (Row Level Security) is disabled for these tables as the app uses custom authentication
-- Access control is handled at the application level by checking PT/client relationships

