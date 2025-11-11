-- Check Frank's onboarding answers and training preferences

-- Get client info and onboarding data
SELECT 
  id,
  name,
  email,
  sex,
  age,
  onboarding_completed_at,
  athlete_profile,
  onboarding_answers
FROM clients
WHERE id = 25;

-- Pretty print the athlete_profile
SELECT 
  name,
  jsonb_pretty(athlete_profile) as athlete_profile_formatted
FROM clients
WHERE id = 25;

-- Pretty print the onboarding_answers
SELECT 
  name,
  jsonb_pretty(onboarding_answers) as onboarding_answers_formatted
FROM clients
WHERE id = 25;

-- Extract specific training preferences
SELECT 
  name,
  athlete_profile->'training_preferences'->>'trainingDaysPerWeek' as training_days_per_week,
  athlete_profile->'training_preferences'->>'runSessionsPerWeek' as runs_per_week,
  athlete_profile->'training_preferences'->>'focusAreas' as focus_areas,
  athlete_profile->'training_preferences'->>'hillsOrSprints' as hills_or_sprints,
  athlete_profile->'training_preferences'->>'wantsPTCheckins' as wants_pt_checkins,
  athlete_profile->'training_preferences'->>'equipment' as equipment,
  athlete_profile->'training_preferences'->>'cardioClassFrequency' as cardio_class_frequency
FROM clients
WHERE id = 25;

-- Extract onboarding questionnaire answers
SELECT 
  name,
  onboarding_answers->>'gender' as gender,
  onboarding_answers->>'age' as age,
  onboarding_answers->>'trainingForEvent' as training_for_event,
  onboarding_answers->>'eventName' as event_name,
  onboarding_answers->>'eventDate' as event_date,
  onboarding_answers->>'runTimePerWeek' as run_time_per_week,
  onboarding_answers->>'runIntervals' as run_intervals,
  onboarding_answers->>'runHills' as run_hills,
  onboarding_answers->>'cardioSessions' as cardio_sessions_per_week,
  onboarding_answers->>'cardioModalities' as cardio_modalities,
  onboarding_answers->>'cardioDuration' as cardio_duration
FROM clients
WHERE id = 25;
