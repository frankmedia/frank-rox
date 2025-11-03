-- FIX HYROX SIMULATION FORMAT PARAMETER
-- Changes format from 'hyrox-sim' to 'simulation' so it groups correctly

UPDATE session_blocks
SET parameters = jsonb_set(
  parameters::jsonb,
  '{format}',
  '"simulation"'
)
WHERE id IN (
  SELECT sb.id 
  FROM session_blocks sb 
  JOIN sessions s ON s.id = sb.session_id
  WHERE s.name = 'Hyrox Simulation (Open Men)'
    AND sb.block_type = 'simulation'
);

-- Verify the fix:
SELECT 
  sb.id,
  sb.block_type,
  sb.parameters
FROM session_blocks sb
JOIN sessions s ON s.id = sb.session_id
WHERE s.name = 'Hyrox Simulation (Open Men)'
  AND sb.block_type = 'simulation';

-- Expected: parameters.format should now be "simulation" not "hyrox-sim"

