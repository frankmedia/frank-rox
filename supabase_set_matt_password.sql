-- ============================================
-- SET MATT'S PASSWORD
-- ============================================

-- First, ensure the password column exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'clients' 
        AND column_name = 'password'
    ) THEN
        ALTER TABLE clients ADD COLUMN password TEXT;
        RAISE NOTICE '✅ Added password column to clients table';
    ELSE
        RAISE NOTICE '✓ Password column already exists';
    END IF;
END $$;

-- Set Matt's password to 'matt123'
UPDATE clients 
SET password = 'matt123' 
WHERE name ILIKE '%matt%';

-- Verify it was set
SELECT id, name, email, password 
FROM clients 
WHERE name ILIKE '%matt%';

