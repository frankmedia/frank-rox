-- ============================================
-- TEST THE EXACT QUERY THE APP IS USING
-- ============================================

-- This mimics what the Supabase JS client does with ilike
SELECT id, name, email, password
FROM clients
WHERE name ILIKE 'matt';

-- Also try case variations
SELECT id, name, email, password
FROM clients
WHERE name ILIKE 'Matt';

SELECT id, name, email, password
FROM clients
WHERE name ILIKE '%matt%';

-- Check if Matt exists at all
SELECT COUNT(*), STRING_AGG(name, ', ') as all_names
FROM clients;

