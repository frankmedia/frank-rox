-- Update Alice's cardio sessions to 4
UPDATE clients
SET onboarding_answers = jsonb_set(
  COALESCE(onboarding_answers, '{}'::jsonb),
  '{cardioSessions}',
  '4'::jsonb
)
WHERE email = 'alice@e.co';

-- Verify
SELECT 
  email,
  onboarding_answers->'cardioSessions' as cardio_sessions,
  onboarding_answers->'cardioModalities' as cardio_modalities
FROM clients 
WHERE email = 'alice@e.co';
