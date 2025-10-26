# Testing Supabase Swap - Step by Step

## ⚠️ IMPORTANT: Test Before Committing!

## Pre-requisites

### 1. Check Supabase has a client matching your test user

Run this query in Supabase SQL Editor:

```sql
SELECT id, name, email FROM clients;
```

You should see clients like "Frank", "david", etc.

**If no clients exist, create one:**

```sql
INSERT INTO clients (name, email) 
VALUES ('frank', 'frank@example.com');
```

### 2. Check that client has an active plan

```sql
SELECT p.id, p.name, p.client_id, c.name as client_name, p.status
FROM plans p
JOIN clients c ON p.client_id = c.id
WHERE p.status = 'active';
```

**If no plan exists, create one in the admin:**
1. Go to http://localhost:8081/admin/clients
2. Click "+ Add New Plan" for your test client
3. This will create a plan with 14 empty days

### 3. Add some exercises to a day (via admin)

1. Go to http://localhost:8081/admin/clients
2. Click "View Plan" on the active plan
3. Drag some exercises from the library into Day 1
4. Click the green checkmark to mark it ready

---

## Testing Steps

### Test 1: Login and Check clientId

1. **Open browser console** (F12)
2. **Login** with username that exists in Supabase (e.g., "frank")
3. **Check console logs** - you should see:
   ```
   ✅ Found Supabase client ID: <some-uuid>
   ```
4. **Check localStorage**:
   ```javascript
   JSON.parse(localStorage.getItem('frank_rock_user'))
   // Should show: { username: "frank", clientId: "..." }
   ```

**✅ PASS**: clientId is set
**❌ FAIL**: clientId is undefined → Check Supabase clients table

---

### Test 2: Overview Page Loads from Supabase

1. **Go to Overview page** (home page after login)
2. **Check console logs** - you should see:
   ```
   📊 Using Supabase for data (clientId: ...)
   📊 Loading Overview from Supabase
   ```
3. **Check the 14-day grid displays**
4. **Check exercise counts** show on each day card

**✅ PASS**: Days load from Supabase
**❌ FAIL**: 
- If you see "📄 Using Google Sheets" → clientId not found
- If days are empty → No plan or plan_days in Supabase

---

### Test 3: Today Page Loads from Supabase

1. **Click on "Today" in bottom nav**
2. **Check console logs** - you should see:
   ```
   📊 Using Supabase for data (clientId: ...)
   ✅ Supabase data loaded successfully!
   ```
3. **Check exercises display** for current day
4. **Try clicking on an exercise** - should open detail page

**✅ PASS**: Today's exercises load from Supabase
**❌ FAIL**: No exercises → Add exercises to current day in admin

---

### Test 4: Fallback to Google Sheets

1. **Open** `src/contexts/DataContext.tsx`
2. **Change line 7**: `const USE_SUPABASE = false;`
3. **Refresh the page**
4. **Check console logs** - you should see:
   ```
   📄 Using Google Sheets for data
   ```
5. **Verify Overview and Today pages still work**

**✅ PASS**: Sheets fallback works
**❌ FAIL**: Check Google Sheets API key and master sheet

---

### Test 5: User Without Supabase Client

1. **Login with a user that doesn't exist in Supabase**
2. **Check console logs** - you should see:
   ```
   ⚠️ No Supabase client found for: <username>
   ⚠️ Supabase enabled but no clientId found, falling back to Sheets
   📄 Using Google Sheets for data
   ```
3. **Verify app still works** with Sheets

**✅ PASS**: Graceful fallback works
**❌ FAIL**: App crashes → Need better error handling

---

## Common Issues & Fixes

### Issue: "No active plan found"
**Fix**: Create a plan for the client in admin

### Issue: "clientId is undefined"
**Fix**: 
1. Check client exists in Supabase with matching name
2. Check the `.ilike("name", username)` query in AuthContext
3. Name matching is case-insensitive but must be exact

### Issue: "Days show 0 exercises"
**Fix**: Add exercises to days via admin panel

### Issue: "Exercises don't show on Today page"
**Fix**: 
1. Check `current_day` in plans table matches the day you added exercises to
2. Check `plan_days` table has correct `day_index`
3. Check exercises are in `session_block_items` with correct `day_id`

---

## Rollback Plan

If anything breaks:

1. **Set** `USE_SUPABASE = false` in `DataContext.tsx`
2. **Refresh** the page
3. **Everything should work** with Google Sheets again

No data is lost, no commits needed to rollback!

---

## Ready to Commit?

Only commit when:
- ✅ All 5 tests pass
- ✅ You've tested with both Supabase and Sheets
- ✅ You've tested with a user that has/doesn't have a Supabase client
- ✅ No console errors

## What to Test in Production

After deploying to Vercel:
1. Login with real client username
2. Check Overview shows their plan
3. Check Today shows their exercises
4. Check they can complete exercises and log workouts

