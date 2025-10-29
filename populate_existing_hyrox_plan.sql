-- Populate the existing HYROX plan with template slots
-- Plan ID: c5c68bfa-4ab6-4792-ad8d-9b6dd7724199

DO $$
DECLARE
  plan_uuid UUID := 'c5c68bfa-4ab6-4792-ad8d-9b6dd7724199';
  template_uuid UUID;
  movement_req RECORD;
  plan_day_uuid UUID;
  session_uuid UUID;
  block_uuid UUID;
  workout_day_indices INT[] := ARRAY[0, 7, 14, 21, 28, 35, 42, 49, 56, 63, 70, 77]; -- Every 7 days for 12 weeks (Mon of each week)
  workout_day_indices2 INT[] := ARRAY[1, 8, 15, 22, 29, 36, 43, 50, 57, 64, 71, 78]; -- Every 7 days + 1 (Tue of each week)
  all_workout_days INT[];
  day_idx INT;
BEGIN
  -- Get the template ID
  SELECT id INTO template_uuid FROM plan_templates WHERE name = 'HYROX 12-Week Race Prep' LIMIT 1;
  
  IF template_uuid IS NULL THEN
    RAISE EXCEPTION 'HYROX template not found. Run supabase_seed_hyrox_template.sql first!';
  END IF;
  
  RAISE NOTICE '🎯 Found template ID: %', template_uuid;
  
  -- Combine workout days (Mon + Tue for Upper+Lower split, 5 days per week)
  all_workout_days := workout_day_indices || workout_day_indices2 || 
                      ARRAY[2, 9, 16, 23, 30, 37, 44, 51, 58, 65, 72, 79] || -- Wed (recovery)
                      ARRAY[3, 10, 17, 24, 31, 38, 45, 52, 59, 66, 73, 80] || -- Thu (functional)
                      ARRAY[4, 11, 18, 25, 32, 39, 46, 53, 60, 67, 74, 81];   -- Fri (endurance)
  
  -- Loop through workout days
  FOREACH day_idx IN ARRAY all_workout_days
  LOOP
    -- Skip if day_idx >= 84 (we only have 84 days)
    IF day_idx >= 84 THEN
      CONTINUE;
    END IF;
    
    -- Get the plan_day ID
    SELECT id INTO plan_day_uuid FROM plan_days 
    WHERE plan_id = plan_uuid AND day_index = day_idx;
    
    IF plan_day_uuid IS NULL THEN
      RAISE NOTICE '⚠️ Day % not found', day_idx;
      CONTINUE;
    END IF;
    
    -- Create a session for this day
    INSERT INTO sessions (plan_day_id, name, order_index)
    VALUES (plan_day_uuid, 'Day ' || (day_idx + 1) || ' - Template Workout', 0)
    RETURNING id INTO session_uuid;
    
    -- Create a block for this session
    INSERT INTO session_blocks (session_id, block_type, title)
    VALUES (session_uuid, 'strength', 'Template Slots')
    RETURNING id INTO block_uuid;
    
    -- Insert placeholder items for each movement requirement
    FOR movement_req IN 
      SELECT * FROM template_movement_requirements 
      WHERE template_id = template_uuid 
      ORDER BY priority_order
    LOOP
      INSERT INTO session_block_items (
        block_id, 
        exercise_id, 
        item_order, 
        status, 
        extra
      ) VALUES (
        block_uuid,
        NULL, -- Will be filled by PT
        movement_req.priority_order,
        'draft',
        jsonb_build_object(
          'template_requirement', jsonb_build_object(
            'movement_pattern', movement_req.movement_pattern,
            'warmup_sets', movement_req.warmup_sets,
            'warmup_reps', movement_req.warmup_reps,
            'working_sets', movement_req.working_sets,
            'working_reps', movement_req.working_reps,
            'intensity', movement_req.intensity_guideline,
            'rest_seconds', movement_req.rest_seconds,
            'notes', movement_req.notes
          )
        )
      );
    END LOOP;
    
    RAISE NOTICE '✅ Created slots for day %', day_idx + 1;
  END LOOP;
  
  RAISE NOTICE '🎉 Successfully populated HYROX plan with template slots!';
END $$;

