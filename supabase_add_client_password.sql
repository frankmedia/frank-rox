-- ============================================
-- ADD PASSWORD COLUMN TO CLIENTS TABLE
-- ============================================
-- Allows clients to have a password stored for their account

-- Add password column if it doesn't exist
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
        RAISE NOTICE '⚠️  Password column already exists';
    END IF;
END $$;

-- Optional: Set default passwords for existing clients (they can change it later)
-- UPDATE clients SET password = 'changeme' WHERE password IS NULL;

