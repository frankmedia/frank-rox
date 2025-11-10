-- Check plan_days table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'plan_days'
ORDER BY ordinal_position;

-- Or check by selecting from an existing plan_day
SELECT *
FROM plan_days
LIMIT 1;

