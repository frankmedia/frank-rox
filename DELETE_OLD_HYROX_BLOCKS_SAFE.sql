-- ⚠️ DELETE ONLY OLD/BROKEN HYROX BLOCKS ⚠️
-- This will KEEP the new "simulation" block and delete the old "circuit" ones

-- First, check what we're about to delete (run this first!)
SELECT 
  s.id as session_id,
  s.name,
  sb.id as block_id,
  sb.block_type,
  sb.title,
  COUNT(sbi.id) as item_count
FROM sessions s
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE (s.name ILIKE '%HYROX%' AND s.name != 'Hyrox Simulation (Open Men)')
   OR (sb.title ILIKE '%HYROX%' AND sb.block_type != 'simulation')
GROUP BY s.id, s.name, sb.id, sb.block_type, sb.title
ORDER BY s.name, sb.block_type;

-- NOW DELETE THEM (uncomment after reviewing)
/*
DELETE FROM session_block_items 
WHERE block_id IN (
  SELECT sb.id 
  FROM session_blocks sb 
  JOIN sessions s ON s.id = sb.session_id
  WHERE (s.name ILIKE '%HYROX%' AND s.name != 'Hyrox Simulation (Open Men)')
     OR (sb.title ILIKE '%HYROX%' AND sb.block_type != 'simulation')
);

DELETE FROM session_blocks 
WHERE id IN (
  SELECT sb.id 
  FROM session_blocks sb 
  JOIN sessions s ON s.id = sb.session_id
  WHERE (s.name ILIKE '%HYROX%' AND s.name != 'Hyrox Simulation (Open Men)')
     OR (sb.title ILIKE '%HYROX%' AND sb.block_type != 'simulation')
);

DELETE FROM sessions 
WHERE name ILIKE '%HYROX%' AND name != 'Hyrox Simulation (Open Men)';
*/

-- ✅ After deleting, you should ONLY have:
--    session_id: 6e441a07-e9c9-455d-808f-fa7653a81bc6
--    name: "Hyrox Simulation (Open Men)"
--    block_type: "simulation"
--    item_count: 16

-- Verify the good one remains:
SELECT 
  s.id as session_id,
  s.name,
  sb.id as block_id,
  sb.block_type,
  sb.title,
  sb.parameters,
  COUNT(sbi.id) as item_count
FROM sessions s
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE s.name = 'Hyrox Simulation (Open Men)'
  AND sb.block_type = 'simulation'
GROUP BY s.id, s.name, sb.id, sb.block_type, sb.title, sb.parameters;

