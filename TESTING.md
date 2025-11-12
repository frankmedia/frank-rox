# Program Generation Testing Guide

## Quick Test (Recommended)

The fastest way to test the program generation is to use the simple Node.js test script:

### 1. Update Configuration

Edit `test-generation.js` and update these values:

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const TEST_CLIENT_ID = 'your-test-client-id';
```

To find a test client ID, run this SQL in Supabase:

```sql
SELECT id, name, email FROM clients LIMIT 5;
```

### 2. Run the Test

```bash
node test-generation.js
```

### 3. What It Tests

The script will:
- ✅ Verify the client exists
- ✅ Check existing plans
- ✅ Analyze plan structure (14 days)
- ✅ Validate Week 2 run progression (distance + duration)
- ✅ Check rest day recovery sessions

## What to Look For

### ✅ PASS Criteria

1. **All days have sessions**
   - Days with workouts: Should show exercises
   - Rest days (e.g., Day 2, 4, 9, 11): Should have recovery sessions

2. **Week 2 run progression is correct**
   - Example: 7km → 8km
   - Duration: 42min → 48min (8km × 6 min/km = 48min) ✅

3. **No missing recovery sessions**
   - Every rest day in Week 1 should have "Active Recovery" session

### ❌ FAIL Criteria

1. **Rest days with 0 exercises**
   ```
   ⚠️  Day 2 (Tuesday): 0 session(s), 0 exercise(s)
   ```
   This means recovery session creation FAILED

2. **Wrong run duration**
   ```
   Week 2 (Day 13): 8.0km • 42min
   ❌ Duration WRONG! Expected 48min for 8.0km at 6 min/km
   ```

3. **Missing rest day recovery**
   ```
   ❌ Day 2: MISSING recovery session!
   ```

## Full Test Suite (Advanced)

For comprehensive testing with TypeScript:

### 1. Install Dependencies

```bash
npm install -D tsx @types/node
```

### 2. Run Full Test

```bash
npx tsx src/services/programGeneration/__tests__/testProgramGeneration.ts
```

This will:
- Delete existing plans
- Generate a fresh plan
- Validate all 14 days
- Check progression logic
- Verify data integrity

## Manual Testing via UI

### 1. Delete Current Plan

In Supabase SQL Editor:

```sql
-- Find your client ID
SELECT id, name, email FROM clients WHERE name = 'your-name';

-- Delete your plan (CASCADE will delete everything)
DELETE FROM plans WHERE client_id = 'your-client-id';
```

### 2. Regenerate Plan

1. Go to `/program-builder`
2. Click "Generate Plan"
3. Wait for generation to complete

### 3. Verify in UI

Go to `/overview` and check:

- **Day 2, 4, 9, 11**: Should show "Recovery Focus" with 13 mobility exercises
- **Day 6**: Should show run (e.g., "7.0km • 42min")
- **Day 13**: Should show run (e.g., "8.0km • 48min") ← **CRITICAL TEST**

## Common Issues

### Issue: "Client not found"

**Solution**: Update `TEST_CLIENT_ID` in the test script with a valid client ID from your database.

### Issue: "Duration WRONG"

**Solution**: This means the refactor didn't work. The old code was adding 10 seconds instead of recalculating. Check that the new progression module is being used.

### Issue: "MISSING recovery session"

**Solution**: The recovery session creator failed. Check console logs for errors (e.g., missing exercises in database).

## Expected Output

```
🧪 ========================================
🧪 QUICK PROGRAM GENERATION TEST
🧪 ========================================

1️⃣  Checking if client exists...
✅ Found client: frank (frank@roxpt.app)

2️⃣  Checking for existing plans...
✅ Found 1 existing plan(s):
   - Block 1 - Base Phase (active, 14 days)

3️⃣  Analyzing plan structure...
✅ Found 14 days

✅ Day 1 (Monday): 1 session(s), 6 exercise(s)
✅ Day 2 (Tuesday): 1 session(s), 13 exercise(s)
✅ Day 3 (Wednesday): 1 session(s), 7 exercise(s)
✅ Day 4 (Thursday): 1 session(s), 13 exercise(s)
✅ Day 5 (Friday): 1 session(s), 7 exercise(s)
✅ Day 6 (Saturday): 1 session(s), 1 exercise(s)
      Run: 7.0km • 42min
✅ Day 7 (Sunday): 1 session(s), 13 exercise(s)
✅ Day 8 (Monday): 1 session(s), 6 exercise(s)
✅ Day 9 (Tuesday): 1 session(s), 13 exercise(s)
✅ Day 10 (Wednesday): 1 session(s), 8 exercise(s)
✅ Day 11 (Thursday): 1 session(s), 13 exercise(s)
✅ Day 12 (Friday): 1 session(s), 7 exercise(s)
✅ Day 13 (Saturday): 1 session(s), 1 exercise(s)
      Run: 8.0km • 48min
✅ Day 14 (Sunday): 1 session(s), 13 exercise(s)

4️⃣  Checking Week 2 run progression...
   Week 1 (Day 6):  7.0km • 42min
   Week 2 (Day 13): 8.0km • 48min
   ✅ Duration correct (48min = 8.0km × 6 min/km)

5️⃣  Checking rest day recovery sessions...
   Found 2 rest day(s) in Week 1
   ✅ Day 2: Has recovery session
   ✅ Day 4: Has recovery session

🧪 ========================================
🧪 TEST COMPLETE
🧪 ========================================
```

## Success Criteria

All tests pass when:
- ✅ All 14 days have sessions
- ✅ Rest days (2, 4, 9, 11) have 13 mobility exercises
- ✅ Week 2 runs have correct duration (distance × 6 min/km)
- ✅ No "MISSING recovery session" errors
- ✅ No "Duration WRONG" errors

