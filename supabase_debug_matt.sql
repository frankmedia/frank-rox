-- ============================================
-- DEBUG: CHECK MATT'S DATA
-- ============================================

-- 1. Check all clients with 'matt' in the name (case-insensitive)
SELECT id, name, email, password, 
       LENGTH(name) as name_length,
       LENGTH(TRIM(name)) as trimmed_length
FROM clients 
WHERE name ILIKE '%matt%';

-- 2. Check exact match
SELECT id, name, email, password
FROM clients 
WHERE LOWER(TRIM(name)) = 'matt';

-- 3. Show ALL clients (to see what exists)
SELECT id, name, email, password 
FROM clients 
ORDER BY name;

-- 4. Check if password column exists and has data
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'clients' 
AND column_name IN ('name', 'password', 'email');

