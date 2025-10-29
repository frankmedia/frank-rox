-- Check if HYROX template exists and has movement requirements

-- 1. Check if template exists
SELECT 
  id, 
  name, 
  days_per_week, 
  weeks_duration,
  created_at
FROM plan_templates 
WHERE name = 'HYROX 12-Week Race Prep';

-- 2. Check movement requirements for this template
SELECT 
  tmr.id,
  tmr.movement_pattern,
  tmr.frequency_per_week,
  tmr.working_sets,
  tmr.working_reps,
  tmr.intensity_guideline,
  tmr.priority_order,
  tmr.notes
FROM template_movement_requirements tmr
WHERE tmr.template_id = (
  SELECT id FROM plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1
)
ORDER BY priority_order;

-- 3. Check if the plan has any sessions/exercises
SELECT 
  pd.day_index,
  pd.label,
  COUNT(sbi.id) as exercise_count
FROM plan_days pd
LEFT JOIN sessions s ON s.plan_day_id = pd.id
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE pd.plan_id = 'c5c68bfa-4ab6-4792-ad8d-9b6dd7724199'
GROUP BY pd.day_index, pd.label, pd.id
ORDER BY pd.day_index
LIMIT 10;

