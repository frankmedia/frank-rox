# CASCADE DELETE System

## Overview
This document explains how the database CASCADE DELETE rules work to automatically clean up all associated data when a client or plan is deleted.

---

## Database Schema Hierarchy

```
clients
  ├─→ plans (ON DELETE CASCADE)
  │     ├─→ plan_days (ON DELETE CASCADE)
  │     │     ├─→ sessions (ON DELETE CASCADE)
  │     │     │     ├─→ session_blocks (ON DELETE CASCADE)
  │     │     │     │     └─→ session_block_items (ON DELETE CASCADE)
  │     │     │     │
  │     │     │     └─→ [exercises defined here]
  │     │     │
  │     │     └─→ [daily structure]
  │     │
  │     └─→ completed_days (ON DELETE CASCADE)
  │
  ├─→ workout_logs (ON DELETE CASCADE)
  │
  └─→ [client profile data]
```

---

## What Happens When You Delete a Client

### Single Database Operation
```sql
DELETE FROM clients WHERE id = 'client-uuid';
```

### Automatic Cascade Chain
The database automatically deletes (in order):

1. **workout_logs** - All workout history and PBs
2. **completed_days** - All day completion tracking
3. **plans** - All training plans
   - Then for each plan:
     - **plan_days** - All day structures
       - Then for each plan_day:
         - **sessions** - All workout sessions
           - Then for each session:
             - **session_blocks** - All workout blocks (warm-up, main, cool-down)
               - Then for each block:
                 - **session_block_items** - All individual exercises

### Total Records Deleted
For a typical client with 1 active plan (14 days, 6 workout days):
- **1** client record
- **~50-100** workout_logs
- **~10-20** completed_days
- **1-3** plans
- **~14-42** plan_days
- **~6-18** sessions
- **~18-54** session_blocks
- **~60-200** session_block_items

**Total: ~150-400 records deleted with ONE SQL statement**

---

## What Happens When You Delete a Plan

### Single Database Operation
```sql
DELETE FROM plans WHERE id = 'plan-uuid';
```

### Automatic Cascade Chain
1. **completed_days** for that plan
2. **plan_days** for that plan
   - **sessions** for those days
     - **session_blocks** for those sessions
       - **session_block_items** for those blocks

### Client Data Preserved
- ✅ Client profile remains
- ✅ workout_logs remain (historical data)
- ✅ Other plans remain (if any)

---

## Migration Setup

### Run This SQL in Supabase
Copy and paste the entire contents of `migrations/add_cascade_deletes.sql` into the Supabase SQL Editor and run it.

This will:
1. Drop existing foreign key constraints
2. Recreate them with `ON DELETE CASCADE`
3. Verify all CASCADE rules are in place

### Verification Query
```sql
SELECT 
  tc.table_name, 
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
JOIN information_schema.referential_constraints AS rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND tc.table_name IN ('plans', 'plan_days', 'sessions', 'session_blocks', 'session_block_items', 'workout_logs', 'completed_days')
ORDER BY tc.table_name;
```

**Expected Output**: All `delete_rule` columns should show `CASCADE`

---

## Code Changes

### Before (Manual Deletion)
```typescript
// Had to manually delete in correct order
await supabase.from("session_block_items").delete()...
await supabase.from("session_blocks").delete()...
await supabase.from("sessions").delete()...
await supabase.from("plan_days").delete()...
await supabase.from("plans").delete()...
await supabase.from("workout_logs").delete()...
await supabase.from("clients").delete()...
```

### After (CASCADE Handles It)
```typescript
// Database automatically deletes everything
await supabase.from("clients").delete().eq("id", clientId);
```

---

## Safety Features

### Confirmation Dialog
Before deleting a client, the user sees:

```
Are you sure you want to delete [Name]?

This will permanently delete:
• All their plans and workouts
• All workout logs and history
• All progress tracking data

This action CANNOT be undone.
```

### Soft Delete Alternative
If you want to keep historical data, consider implementing soft deletes:

```sql
-- Add is_deleted column
ALTER TABLE clients ADD COLUMN is_deleted BOOLEAN DEFAULT false;

-- "Delete" without actually deleting
UPDATE clients SET is_deleted = true WHERE id = 'client-uuid';

-- Filter out deleted clients in queries
SELECT * FROM clients WHERE is_deleted = false;
```

---

## Testing

### Test Client Deletion
1. Create a test client: "Test User"
2. Assign them a plan with exercises
3. Complete a few workouts (create workout_logs)
4. Delete the client
5. Verify all data is gone:

```sql
-- Check plans
SELECT COUNT(*) FROM plans WHERE client_id = 'deleted-client-id';
-- Should return 0

-- Check workout logs
SELECT COUNT(*) FROM workout_logs WHERE client_id = 'deleted-client-id';
-- Should return 0

-- Check completed days
SELECT COUNT(*) FROM completed_days WHERE client_id = 'deleted-client-id';
-- Should return 0
```

### Test Plan Deletion
1. Create a plan for an existing client
2. Add exercises and sessions
3. Delete the plan
4. Verify:
   - Client still exists
   - workout_logs still exist
   - All plan-specific data is gone

---

## Performance Considerations

### Indexing
Ensure foreign key columns are indexed for fast CASCADE operations:

```sql
CREATE INDEX IF NOT EXISTS idx_plans_client_id ON plans(client_id);
CREATE INDEX IF NOT EXISTS idx_plan_days_plan_id ON plan_days(plan_id);
CREATE INDEX IF NOT EXISTS idx_sessions_plan_day_id ON sessions(plan_day_id);
CREATE INDEX IF NOT EXISTS idx_session_blocks_session_id ON session_blocks(session_id);
CREATE INDEX IF NOT EXISTS idx_session_block_items_block_id ON session_block_items(block_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_client_id ON workout_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_completed_days_client_id ON completed_days(client_id);
CREATE INDEX IF NOT EXISTS idx_completed_days_plan_id ON completed_days(plan_id);
```

### Large Deletions
For clients with years of data (1000+ workout logs, multiple plans):
- Deletion might take 1-5 seconds
- Consider adding a loading spinner
- Run deletion in a transaction (automatic with CASCADE)

---

## Troubleshooting

### Error: "update or delete on table violates foreign key constraint"
**Cause**: CASCADE rules not properly set up  
**Fix**: Run `migrations/add_cascade_deletes.sql`

### Error: "permission denied for table"
**Cause**: RLS policies blocking deletion  
**Fix**: Ensure `anon` role has DELETE permission:
```sql
GRANT DELETE ON TABLE clients TO anon;
```

### Orphaned Records After Deletion
**Cause**: CASCADE rules missing or disabled  
**Fix**: 
1. Run verification query (see above)
2. Manually clean up orphaned records
3. Re-run migration

---

## Files Modified

- `migrations/add_cascade_deletes.sql` - Database migration
- `src/pages/admin/Clients.tsx` - Simplified client deletion
- `CASCADE_DELETE_SYSTEM.md` - This documentation

---

**Last Updated**: 2025-11-12  
**Status**: ✅ Ready to deploy

