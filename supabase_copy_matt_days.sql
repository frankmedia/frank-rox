-- ============================================
-- COPY DAYS 1, 2, 4 → DAYS 8, 9, 11
-- ============================================
-- This completes Matt's 14-day program by copying the workout structure

DO $$
DECLARE
    matt_plan_id UUID;
    
    -- Source day IDs (Days 1, 2, 4)
    day1_id UUID;
    day2_id UUID;
    day4_id UUID;
    
    -- Target day IDs (Days 8, 9, 11)
    day8_id UUID;
    day9_id UUID;
    day11_id UUID;
    
    -- Loop variables
    source_session RECORD;
    new_session_id UUID;
    source_block RECORD;
    new_block_id UUID;
    source_item RECORD;
BEGIN
    -- Get Matt's plan ID
    SELECT id INTO matt_plan_id 
    FROM plans 
    WHERE name LIKE '%Matt%' 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    IF matt_plan_id IS NULL THEN
        RAISE EXCEPTION 'Matt''s plan not found!';
    END IF;
    
    RAISE NOTICE '📋 Found Matt''s plan: %', matt_plan_id;
    
    -- Get source day IDs
    SELECT id INTO day1_id FROM plan_days WHERE plan_id = matt_plan_id AND day_index = 0;
    SELECT id INTO day2_id FROM plan_days WHERE plan_id = matt_plan_id AND day_index = 1;
    SELECT id INTO day4_id FROM plan_days WHERE plan_id = matt_plan_id AND day_index = 3;
    
    -- Get target day IDs
    SELECT id INTO day8_id FROM plan_days WHERE plan_id = matt_plan_id AND day_index = 7;
    SELECT id INTO day9_id FROM plan_days WHERE plan_id = matt_plan_id AND day_index = 8;
    SELECT id INTO day11_id FROM plan_days WHERE plan_id = matt_plan_id AND day_index = 10;
    
    RAISE NOTICE '✅ Found all source and target days';
    
    -- ============================================
    -- COPY DAY 1 → DAY 8 (Interval Run)
    -- ============================================
    
    RAISE NOTICE '🔄 Copying Day 1 → Day 8...';
    
    FOR source_session IN 
        SELECT * FROM sessions WHERE plan_day_id = day1_id ORDER BY order_index
    LOOP
        -- Create new session
        INSERT INTO sessions (plan_day_id, name, order_index)
        VALUES (day8_id, source_session.name, source_session.order_index)
        RETURNING id INTO new_session_id;
        
        -- Copy all blocks for this session
        FOR source_block IN
            SELECT * FROM session_blocks WHERE session_id = source_session.id ORDER BY order_index
        LOOP
            -- Create new block
            INSERT INTO session_blocks (
                session_id, 
                block_type, 
                title, 
                rounds,
                rest_between_rounds_s,
                time_cap_sec,
                work_sec,
                rest_sec,
                intensity,
                order_index
            )
            VALUES (
                new_session_id,
                source_block.block_type,
                source_block.title,
                source_block.rounds,
                source_block.rest_between_rounds_s,
                source_block.time_cap_sec,
                source_block.work_sec,
                source_block.rest_sec,
                source_block.intensity,
                source_block.order_index
            )
            RETURNING id INTO new_block_id;
            
            -- Copy all items for this block
            FOR source_item IN
                SELECT * FROM session_block_items WHERE block_id = source_block.id ORDER BY item_order
            LOOP
                INSERT INTO session_block_items (
                    block_id,
                    exercise_id,
                    item_order,
                    extra,
                    status
                )
                VALUES (
                    new_block_id,
                    source_item.exercise_id,
                    source_item.item_order,
                    source_item.extra,
                    source_item.status
                );
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Day 1 → Day 8 complete!';
    
    -- ============================================
    -- COPY DAY 2 → DAY 9 (Core + Strong)
    -- ============================================
    
    RAISE NOTICE '🔄 Copying Day 2 → Day 9...';
    
    FOR source_session IN 
        SELECT * FROM sessions WHERE plan_day_id = day2_id ORDER BY order_index
    LOOP
        INSERT INTO sessions (plan_day_id, name, order_index)
        VALUES (day9_id, source_session.name, source_session.order_index)
        RETURNING id INTO new_session_id;
        
        FOR source_block IN
            SELECT * FROM session_blocks WHERE session_id = source_session.id ORDER BY order_index
        LOOP
            INSERT INTO session_blocks (
                session_id, 
                block_type, 
                title, 
                rounds,
                rest_between_rounds_s,
                time_cap_sec,
                work_sec,
                rest_sec,
                intensity,
                order_index
            )
            VALUES (
                new_session_id,
                source_block.block_type,
                source_block.title,
                source_block.rounds,
                source_block.rest_between_rounds_s,
                source_block.time_cap_sec,
                source_block.work_sec,
                source_block.rest_sec,
                source_block.intensity,
                source_block.order_index
            )
            RETURNING id INTO new_block_id;
            
            FOR source_item IN
                SELECT * FROM session_block_items WHERE block_id = source_block.id ORDER BY item_order
            LOOP
                INSERT INTO session_block_items (
                    block_id,
                    exercise_id,
                    item_order,
                    extra,
                    status
                )
                VALUES (
                    new_block_id,
                    source_item.exercise_id,
                    source_item.item_order,
                    source_item.extra,
                    source_item.status
                );
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Day 2 → Day 9 complete!';
    
    -- ============================================
    -- COPY DAY 4 → DAY 11 (Core + Lift)
    -- ============================================
    
    RAISE NOTICE '🔄 Copying Day 4 → Day 11...';
    
    FOR source_session IN 
        SELECT * FROM sessions WHERE plan_day_id = day4_id ORDER BY order_index
    LOOP
        INSERT INTO sessions (plan_day_id, name, order_index)
        VALUES (day11_id, source_session.name, source_session.order_index)
        RETURNING id INTO new_session_id;
        
        FOR source_block IN
            SELECT * FROM session_blocks WHERE session_id = source_session.id ORDER BY order_index
        LOOP
            INSERT INTO session_blocks (
                session_id, 
                block_type, 
                title, 
                rounds,
                rest_between_rounds_s,
                time_cap_sec,
                work_sec,
                rest_sec,
                intensity,
                order_index
            )
            VALUES (
                new_session_id,
                source_block.block_type,
                source_block.title,
                source_block.rounds,
                source_block.rest_between_rounds_s,
                source_block.time_cap_sec,
                source_block.work_sec,
                source_block.rest_sec,
                source_block.intensity,
                source_block.order_index
            )
            RETURNING id INTO new_block_id;
            
            FOR source_item IN
                SELECT * FROM session_block_items WHERE block_id = source_block.id ORDER BY item_order
            LOOP
                INSERT INTO session_block_items (
                    block_id,
                    exercise_id,
                    item_order,
                    extra,
                    status
                )
                VALUES (
                    new_block_id,
                    source_item.exercise_id,
                    source_item.item_order,
                    source_item.extra,
                    source_item.status
                );
            END LOOP;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE '✅ Day 4 → Day 11 complete!';
    
    -- ============================================
    -- DONE!
    -- ============================================
    
    RAISE NOTICE '🎉 Successfully completed Matt''s 14-day program!';
    RAISE NOTICE '📊 All days now have full workouts';
END $$;

