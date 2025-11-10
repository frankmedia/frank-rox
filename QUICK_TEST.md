# 🧪 Quick Test - Strength Workout Generation

## Step 1: Delete Old Plan
```sql
DELETE FROM plans WHERE client_id = 19;
```

## Step 2: Regenerate
1. Navigate to: `http://localhost:8081/onboarding-complete`
2. Click "Let's Go 🚀"
3. Watch console for NEW logs:

### Expected Console Logs:
```
🚀 Creating plan in database...
💪 Strength data: { bench5rm: XX, squat5rm: XX, deadlift5rm: XX, ohp5rm: XX }
📋 Programme has X sessions:
  1. Monday: Strength Lower + Easy Engine (strength)
  2. Tuesday: Running Intervals (run)
  ...

🏋️ Generating strength workout for Monday (plan_day 1)
💪 Generating strength workout: Strength Lower + Easy Engine
📊 Onboarding data: { bench5rm: "XX", squat5rm: "XX", ... }
💪 Strength data: { bench5rm: XX, squat5rm: XX, deadlift5rm: XX, ohp5rm: XX }
🔧 Starting lower body workout generation
📋 Creating warm-up block for session [session-id]
✅ Warm-up block created: [block-id]
✅ Strength workout "Strength Lower + Easy Engine" generated successfully
```

### If You See Errors:
```
❌ Failed to create warm-up block: [error details]
```

Copy the FULL error message and send it to me!

## Step 3: Verify in Database
```sql
SELECT 
  pd.day_index,
  pd.description as day_name,
  s.name as session_name,
  sb.block_type,
  sb.title as block_title,
  COUNT(sbi.id) as exercise_count
FROM plan_days pd
LEFT JOIN sessions s ON s.plan_day_id = pd.id
LEFT JOIN session_blocks sb ON sb.session_id = s.id
LEFT JOIN session_block_items sbi ON sbi.block_id = sb.id
WHERE pd.plan_id = (SELECT id FROM plans WHERE client_id = 19 ORDER BY created_at DESC LIMIT 1)
GROUP BY pd.day_index, pd.description, s.name, sb.block_type, sb.title
ORDER BY pd.day_index, sb.block_order;
```

### Expected Result:
- Day 1 (Monday) should have:
  - Warm-up block (1 exercise)
  - Main Work block (4 exercises)
  - Core block (1 exercise)
- Day 3 (Wednesday) should have:
  - Warm-up block (1 exercise)
  - Main Work block (4 exercises)
  - Accessory block (2 exercises)

## Step 4: Check Today Page
Navigate to: `http://localhost:8081/today`

Should see strength exercises with:
- ✅ Weight (e.g., "92kg")
- ✅ Notes (e.g., "Strength - 80% 1RM, focus on depth...")

