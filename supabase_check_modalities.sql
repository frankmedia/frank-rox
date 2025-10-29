-- Check what modality values are actually in the exercises table
SELECT DISTINCT modality, COUNT(*) as count
FROM exercises
WHERE modality IS NOT NULL
GROUP BY modality
ORDER BY count DESC;

-- Also check the constraint definition
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'exercises'::regclass
AND conname LIKE '%modality%';

