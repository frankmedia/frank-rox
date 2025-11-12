# 🧪 QUICK TEST GUIDE

## Run the Test (3 Steps)

### 1. Get Your Client ID

In Supabase SQL Editor:
```sql
SELECT id, name, email FROM clients WHERE name = 'frank';
```

Copy the `id` value.

### 2. Update test-generation.js

```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
const TEST_CLIENT_ID = 'paste-id-here'; // ← Paste the ID from step 1
```

### 3. Run It

```bash
node test-generation.js
```

## What You Should See

```
✅ Day 2 (Tuesday): 1 session(s), 13 exercise(s)  ← Recovery session
✅ Day 6 (Saturday): 1 session(s), 1 exercise(s)
      Run: 7.0km • 42min
✅ Day 9 (Tuesday): 1 session(s), 13 exercise(s)  ← Recovery session
✅ Day 13 (Saturday): 1 session(s), 1 exercise(s)
      Run: 8.0km • 48min  ← CRITICAL: Should be 48min, not 42min!

Week 2 run progression:
   Week 1 (Day 6):  7.0km • 42min
   Week 2 (Day 13): 8.0km • 48min
   ✅ Duration correct (48min = 8.0km × 6 min/km)
```

## ✅ PASS = All These Are True

- Day 2 has 13 exercises (recovery)
- Day 9 has 13 exercises (recovery)
- Day 13 shows "8.0km • **48min**" (not 42min!)
- No "❌" errors

## ❌ FAIL = Any of These

- Day 2 or Day 9 shows "0 exercise(s)"
- Day 13 shows "8.0km • 42min" (wrong!)
- "❌ Duration WRONG!" message
- "❌ MISSING recovery session!" message

## If Tests Fail

1. Check you're using the latest code: `git pull`
2. Delete your plan in Supabase:
   ```sql
   DELETE FROM plans WHERE client_id = 'your-client-id';
   ```
3. Regenerate in UI: Go to `/program-builder` → "Generate Plan"
4. Run test again: `node test-generation.js`
