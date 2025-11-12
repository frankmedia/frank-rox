-- Check Alice's equipment selection
SELECT 
  email,
  onboarding_answers->'equipment' as equipment,
  onboarding_answers->'cardioModalities' as cardio_modalities
FROM clients
WHERE email = 'alice@e.co';
