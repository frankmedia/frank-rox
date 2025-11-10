-- Delete only your active plan (client_id = 8)
DELETE FROM plans 
WHERE status = 'active' 
AND client_id = '8';
