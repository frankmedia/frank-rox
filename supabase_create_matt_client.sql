-- ============================================
-- CREATE MATT AS A CLIENT (if not exists)
-- ============================================

INSERT INTO clients (name, email, phone, notes)
VALUES (
    'Matt',
    'matt@example.com',  -- Change this to Matt's real email
    NULL,
    '14-day training program'
)
ON CONFLICT (email) DO NOTHING
RETURNING id, name, email;

-- Then link the plan to Matt
UPDATE plans 
SET client_id = (SELECT id FROM clients WHERE name = 'Matt' LIMIT 1)
WHERE name LIKE '%Matt%';

