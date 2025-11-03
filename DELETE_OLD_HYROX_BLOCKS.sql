-- ⚠️ DELETE OLD HYROX SIMULATION BLOCKS ⚠️
-- Run this to clean up broken/old Hyrox sim blocks

-- First, find all Hyrox-related sessions
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
WHERE s.name ILIKE '%Hyrox%' 
   OR sb.title ILIKE '%Hyrox%'
   OR sb.block_type = 'simulation'
GROUP BY s.id, s.name, sb.id, sb.block_type, sb.title;

-- NOW DELETE THEM (uncomment the lines below after reviewing above)
/*
DELETE FROM session_block_items 
WHERE block_id IN (
  SELECT sb.id 
  FROM session_blocks sb 
  JOIN sessions s ON s.id = sb.session_id
  WHERE s.name ILIKE '%Hyrox%' 
     OR sb.title ILIKE '%Hyrox%'
     OR sb.block_type = 'simulation'
);

DELETE FROM session_blocks 
WHERE id IN (
  SELECT sb.id 
  FROM session_blocks sb 
  JOIN sessions s ON s.id = sb.session_id
  WHERE s.name ILIKE '%Hyrox%' 
     OR sb.title ILIKE '%Hyrox%'
     OR sb.block_type = 'simulation'
);

DELETE FROM sessions 
WHERE name ILIKE '%Hyrox%';
*/

-- ✅ After running the DELETE commands above, refresh the admin panel
-- ✅ Then drag the "Hyrox Sim" button ONCE to Day 1
-- ✅ The new block will have proper extra data (distance, weight, reps)

