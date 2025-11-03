-- =====================================================
-- ADD METADATA FIELDS TO PROGRAM TEMPLATES
-- Brings back the useful demographic/context fields from v1
-- =====================================================

-- Add metadata columns to program_templates
ALTER TABLE program_templates
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS target_age_min INT,
ADD COLUMN IF NOT EXISTS target_age_max INT,
ADD COLUMN IF NOT EXISTS target_gender TEXT CHECK (target_gender IN ('male', 'female', 'any')),
ADD COLUMN IF NOT EXISTS fitness_level TEXT CHECK (fitness_level IN ('beginner', 'intermediate', 'advanced', 'elite')),
ADD COLUMN IF NOT EXISTS goals TEXT[],
ADD COLUMN IF NOT EXISTS program_type TEXT,
ADD COLUMN IF NOT EXISTS equipment_needed TEXT[],
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Add some helpful comments
COMMENT ON COLUMN program_templates.description IS 'Human-friendly description of what this template is for';
COMMENT ON COLUMN program_templates.target_age_min IS 'Minimum recommended age (e.g., 25)';
COMMENT ON COLUMN program_templates.target_age_max IS 'Maximum recommended age (e.g., 35)';
COMMENT ON COLUMN program_templates.target_gender IS 'Target gender: male, female, or any';
COMMENT ON COLUMN program_templates.fitness_level IS 'Required fitness level';
COMMENT ON COLUMN program_templates.goals IS 'Training goals (e.g., Strength, Hypertrophy, Fat Loss)';
COMMENT ON COLUMN program_templates.program_type IS 'Program category (e.g., Hybrid Race, Strength, Aesthetics)';
COMMENT ON COLUMN program_templates.equipment_needed IS 'Required equipment list';
COMMENT ON COLUMN program_templates.tags IS 'Searchable tags for filtering';

-- Update existing HYROX template with metadata
UPDATE program_templates
SET 
  description = 'Complete interval training session with mobility warmup, agility drills, progressive running intervals, and comprehensive cooldown. Perfect for HYROX and hybrid athletes.',
  target_age_min = 18,
  target_age_max = 55,
  target_gender = 'any',
  fitness_level = 'intermediate',
  goals = ARRAY['Hybrid Race', 'Cardiovascular Endurance', 'Work Capacity'],
  program_type = 'Hybrid Race',
  equipment_needed = ARRAY['Running space or treadmill'],
  tags = ARRAY['hyrox', 'intervals', 'cardio', 'hybrid', 'endurance']
WHERE name = 'HYROX Interval Day';

-- Verify the update
SELECT 
  name,
  description,
  target_age_min || '-' || target_age_max AS age_range,
  target_gender,
  fitness_level,
  program_type,
  goals,
  equipment_needed,
  tags
FROM program_templates
WHERE name = 'HYROX Interval Day';






