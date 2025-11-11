-- Check which recovery/mobility exercises exist in the database

SELECT 
  name,
  modality,
  primary_area,
  movement_pattern,
  tags
FROM exercises
WHERE name ILIKE ANY(ARRAY[
  '%Cat-Cow%',
  '%Quad Stretch%',
  '%Figure 4%',
  '%Figure of 4%',
  '%Hamstring Stretch%',
  '%Hip Flexor Stretch%',
  '%Thoracic Rotation%',
  '%Open Book%',
  '%Standing Hip CARs%',
  '%Hip CARs%',
  '%Ankle Dorsiflexion%',
  '%Foam Roller%',
  '%Easy Walk%',
  '%Band Pull-Apart%',
  '%Band Pull Apart%'
])
ORDER BY name;

-- Count total
SELECT COUNT(*) as total_found FROM exercises
WHERE name ILIKE ANY(ARRAY[
  '%Cat-Cow%',
  '%Quad Stretch%',
  '%Figure 4%',
  '%Figure of 4%',
  '%Hamstring Stretch%',
  '%Hip Flexor Stretch%',
  '%Thoracic Rotation%',
  '%Open Book%',
  '%Standing Hip CARs%',
  '%Hip CARs%',
  '%Ankle Dorsiflexion%',
  '%Foam Roller%',
  '%Easy Walk%',
  '%Band Pull-Apart%',
  '%Band Pull Apart%'
]);
