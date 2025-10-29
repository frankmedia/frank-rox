-- ============================================
-- GRANT ANON ROLE ACCESS TO CLIENTS TABLE
-- ============================================
-- This ensures the public API key can read the clients table

-- Grant SELECT permission to anon role
GRANT SELECT ON clients TO anon;
GRANT SELECT ON clients TO authenticated;

-- Also grant to public role (fallback)
GRANT SELECT ON clients TO PUBLIC;

-- Verify grants
SELECT 
    grantee, 
    table_name, 
    privilege_type
FROM information_schema.table_privileges
WHERE table_schema = 'public' 
AND table_name = 'clients'
ORDER BY grantee, privilege_type;

