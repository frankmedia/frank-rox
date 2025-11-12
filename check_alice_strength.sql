-- Check Alice's strength data
SELECT 
  email,
  onboarding_answers->'bench5rm' as bench_5rm,
  onboarding_answers->'squat5rm' as squat_5rm,
  onboarding_answers->'deadlift5rm' as deadlift_5rm,
  onboarding_answers->'ohp5rm' as ohp_5rm
FROM clients
WHERE email = 'alice@e.co';
