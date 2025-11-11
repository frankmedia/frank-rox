-- Check Frank's complete onboarding data
SELECT 
  id,
  name,
  email,
  onboarding_answers->>'cardioSessions' as cardio_sessions,
  onboarding_answers->>'cardioModalities' as cardio_modalities,
  athlete_profile->'training_preferences'->>'focusAreas' as focus_areas,
  athlete_profile->'training_preferences'->>'equipment' as equipment,
  athlete_profile->'training_preferences'->>'cardioClassFrequency' as cardio_class_freq,
  athlete_profile->'training_preferences'->>'runSessionsPerWeek' as runs_per_week,
  athlete_profile->'training_preferences'->>'trainingDaysPerWeek' as training_days
FROM clients
WHERE id = 27;

-- Also show raw JSON
SELECT 
  'Onboarding Answers:' as section,
  jsonb_pretty(onboarding_answers) as data
FROM clients WHERE id = 27
UNION ALL
SELECT 
  'Athlete Profile:' as section,
  jsonb_pretty(athlete_profile) as data
FROM clients WHERE id = 27;
