-- Check current state
SELECT 
  email,
  onboarding_answers->'cardioSessions' as cardio_sessions,
  onboarding_answers->'cardioModalities' as cardio_modalities,
  athlete_profile->'training_preferences'->'focusAreas' as focus_areas,
  athlete_profile->'training_preferences'->'equipment' as equipment
FROM clients 
WHERE email = 'frank@roxpt.co.uk';

-- Fix: Force cardioSessions and cardioModalities in onboarding_answers
UPDATE clients
SET onboarding_answers = jsonb_set(
  jsonb_set(
    COALESCE(onboarding_answers, '{}'::jsonb),
    '{cardioSessions}',
    '2'::jsonb
  ),
  '{cardioModalities}',
  '["RowErg", "SkiErg"]'::jsonb
)
WHERE email = 'frank@roxpt.co.uk';

-- Fix: Ensure Cardio is in focusAreas and equipment is set
UPDATE clients
SET athlete_profile = jsonb_set(
  jsonb_set(
    COALESCE(athlete_profile, '{}'::jsonb),
    '{training_preferences,focusAreas}',
    '["Running", "Strength", "Cardio"]'::jsonb
  ),
  '{training_preferences,equipment}',
  '["RowErg", "SkiErg"]'::jsonb
)
WHERE email = 'frank@roxpt.co.uk';

-- Verify
SELECT 
  email,
  onboarding_answers->'cardioSessions' as cardio_sessions,
  onboarding_answers->'cardioModalities' as cardio_modalities,
  athlete_profile->'training_preferences'->'focusAreas' as focus_areas,
  athlete_profile->'training_preferences'->'equipment' as equipment
FROM clients 
WHERE email = 'frank@roxpt.co.uk';
