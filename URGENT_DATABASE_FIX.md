# 🚨 URGENT: Database Migration Required

## Problem

The `session_block_items` table is **missing the `weight_kg` column**, which is causing:
- ❌ All exercises failing to load
- ❌ Error: `column session_block_items_2.weight_kg does not exist`
- ❌ 0 exercises fetched for every day

## Solution

Add the `weight_kg` column to the `session_block_items` table in Supabase.

---

## 🔧 Step-by-Step Fix

### Option 1: Supabase Dashboard (RECOMMENDED)

1. **Open Supabase Dashboard:**
   - Go to: https://supabase.com/dashboard
   - Select your project: `wpmmetlzrjbqvgdxqxcq`

2. **Navigate to SQL Editor:**
   - Click "SQL Editor" in the left sidebar
   - Click "New Query"

3. **Run Migration:**
   - Copy the SQL from `migrations/add_weight_kg_column.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Cmd/Ctrl + Enter)

4. **Verify Success:**
   - You should see: `Success. No rows returned`
   - Check the verification query output shows `weight_kg` column

---

### Option 2: Command Line (Alternative)

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref wpmmetlzrjbqvgdxqxcq

# Run the migration
supabase db push --file migrations/add_weight_kg_column.sql
```

---

## 📋 Migration SQL

```sql
-- Add weight_kg column to session_block_items table
ALTER TABLE session_block_items 
ADD COLUMN IF NOT EXISTS weight_kg INTEGER;

-- Add comment to explain the column
COMMENT ON COLUMN session_block_items.weight_kg IS 'Prescribed weight in kilograms, calculated from user onboarding 5RM data';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_session_block_items_weight_kg 
ON session_block_items(weight_kg) 
WHERE weight_kg IS NOT NULL;

-- Verify the column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'session_block_items' 
AND column_name = 'weight_kg';
```

---

## ✅ Verification

After running the migration, verify it worked:

### 1. Check Column Exists

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'session_block_items' 
AND column_name = 'weight_kg';
```

**Expected Output:**
```
column_name | data_type | is_nullable
------------|-----------|------------
weight_kg   | integer   | YES
```

### 2. Test Query

```sql
SELECT 
  id,
  exercise_id,
  sets,
  reps,
  weight_kg,
  notes
FROM session_block_items
LIMIT 5;
```

**Expected:** Query runs without errors (weight_kg will be NULL for existing rows)

---

## 🔄 After Migration: Regenerate Programme

Since the existing programme was created **before** the `weight_kg` column existed, you need to regenerate it:

### Option A: Delete & Regenerate (RECOMMENDED)

1. **Delete existing plan:**
   ```sql
   DELETE FROM plans WHERE client_id = 19; -- Your client_id
   ```

2. **Regenerate programme:**
   - Navigate to: `http://localhost:8081/programme-builder`
   - The system will create a new plan with `weight_kg` populated

### Option B: Backfill Existing Data (Advanced)

If you want to keep the existing plan and backfill weights:

```sql
-- This would require custom logic to recalculate weights
-- for each exercise based on the user's onboarding data
-- NOT RECOMMENDED - easier to regenerate
```

---

## 🧪 Test After Fix

1. **Refresh the app:**
   - Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

2. **Check console:**
   - Should see: `✅ Found today's day: Day X`
   - Should see: `📦 Fetched X exercises for today` (X > 0)
   - Should NOT see: `column session_block_items_2.weight_kg does not exist`

3. **Verify exercises load:**
   - Navigate to: `http://localhost:8081/today`
   - Should see exercises listed
   - Click on an exercise
   - Should see weight (e.g., "92kg") and notes

---

## 🐛 Troubleshooting

### Issue: "Column already exists"
**Solution:** This is fine! The migration uses `IF NOT EXISTS`, so it won't error.

### Issue: "Permission denied"
**Solution:** Ensure you're logged into Supabase with admin/owner permissions.

### Issue: Still seeing "column does not exist" after migration
**Solution:** 
1. Clear browser cache
2. Hard refresh (Cmd+Shift+R)
3. Check you're connected to the correct Supabase project
4. Verify the column exists with the verification query

### Issue: Exercises still not loading after migration
**Solution:** Delete the old plan and regenerate:
```sql
DELETE FROM plans WHERE client_id = YOUR_CLIENT_ID;
```
Then navigate to `/programme-builder` to create a new plan.

---

## 📊 Expected Database Schema After Migration

```
session_block_items
├── id (uuid, PK)
├── block_id (uuid, FK)
├── exercise_id (uuid, FK)
├── item_order (integer)
├── sets (integer)
├── reps (integer)
├── weight_kg (integer) ← NEW COLUMN
├── duration_sec (integer)
├── distance_m (integer)
├── rest_sec (integer)
├── notes (text)
├── extra (jsonb)
└── status (text)
```

---

## 🚀 Next Steps After Fix

1. ✅ Run migration in Supabase
2. ✅ Verify column exists
3. ✅ Delete old plan (if exists)
4. ✅ Navigate to `/programme-builder`
5. ✅ Generate new programme
6. ✅ Verify exercises load with weights
7. ✅ Test Exercise Detail page shows weights and notes

---

## 📞 Need Help?

If the migration fails or you encounter issues:

1. Check Supabase logs in the dashboard
2. Verify you have the correct project selected
3. Ensure you have admin/owner permissions
4. Try running the SQL in smaller chunks (one statement at a time)

---

**This is a critical fix - the app won't work without this column!** 🚨

Run the migration now, then regenerate the programme to see the weight prescription system in action! 💪

