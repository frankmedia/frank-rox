-- Check Frank's training preferences
SELECT 
  c.email,
  c.onboarding_answers->'cardioSessions' as cardio_sessions_from_onboarding,
  c.onboarding_answers->'cardioModalities' as cardio_modalities_from_onboarding,
  c.athlete_profile->'training_preferences' as training_preferences
FROM clients c
WHERE c.email = 'frank@roxpt.co.uk';
