# Testing Guide: Admin → PT → Client System

## ✅ What's Been Implemented

### Code Changes
- ✅ Admin menu now shows/hides based on role
- ✅ "Personal Trainers" menu item added (admin only)
- ✅ "Exercises" and "Templates" hidden from PTs (admin only)
- ✅ Dashboard fetches real PT/Admin data from DB (no more hardcoded "Natalie Shanahan")
- ✅ Admin dashboard shows "Admin" role
- ✅ PT dashboard shows PT name and specializations from DB

### Database
- ✅ SQL migration created (`/migrations/create_admins_and_pts.sql`)
- ✅ Admin account hardcoded: `roxptadmin` / `1gfGLi20jerpVaWJMTQ0`

---

## 🧪 Testing Steps

### Step 1: Run SQL Migration
1. Open Supabase SQL Editor
2. Copy contents of `/migrations/create_admins_and_pts.sql`
3. Paste and run
4. Verify success (should see "Success. No rows returned" or similar)

### Step 2: Test Admin Login
1. Navigate to `/login`
2. Enter:
   - **Username:** `roxptadmin`
   - **Password:** `1gfGLi20jerpVaWJMTQ0`
3. Click "Sign In"
4. **Expected:** Redirects to `/admin` dashboard

### Step 3: Verify Admin Dashboard
1. Check profile card shows:
   - Name: "RoxPT Admin"
   - Email: "roxptadmin"
   - Role: "Admin" (not "HYROX Coach • Strength & Conditioning")
2. Check page title shows: "Admin Dashboard"

### Step 4: Verify Admin Menu
1. Check navigation menu shows:
   - ✅ Dashboard
   - ✅ Clients
   - ✅ **Personal Trainers** (NEW)
   - ✅ Exercises
   - ✅ Templates
   - ✅ Settings

### Step 5: Test Personal Trainers Page
1. Click "Personal Trainers" in menu
2. **Expected:** Shows PT management page
3. Click "Add PT" button
4. Fill in form:
   - Name: Test Coach
   - Email: testcoach@roxpt.com
   - Password: test123
   - Specializations: Hyrox, Running
5. Click "Create PT Account"
6. **Expected:** PT appears in list with 0 clients

### Step 6: Test PT Login
1. Logout (or open incognito)
2. Navigate to `/login`
3. Enter:
   - Username: `testcoach@roxpt.com`
   - Password: `test123`
4. Click "Sign In"
5. **Expected:** Redirects to `/admin` dashboard

### Step 7: Verify PT Dashboard
1. Check profile card shows:
   - Name: "Test Coach"
   - Email: "testcoach@roxpt.com"
   - Role: "Hyrox • Running" (their specializations)
2. Check page title shows: "Coach Dashboard"

### Step 8: Verify PT Menu (Restricted)
1. Check navigation menu shows:
   - ✅ Dashboard
   - ✅ Clients
   - ❌ Personal Trainers (HIDDEN)
   - ❌ Exercises (HIDDEN)
   - ❌ Templates (HIDDEN)
   - ✅ Settings

### Step 9: Test PT Access Restrictions
1. Try to navigate to `/admin/exercises` directly
2. **Expected:** Redirects to `/admin` with error toast "Access denied: Admin only"
3. Try to navigate to `/admin/personal-trainers` directly
4. **Expected:** Redirects to `/admin` with error toast "Access denied: Admin only"

### Step 10: Verify Client Login Still Works
1. Logout
2. Login as a client (e.g., `frank` / `password`)
3. **Expected:** Client sees their training pages (not admin area)

---

## 🐛 Known Issues / Future Work

- [ ] Password hashing (currently plain text)
- [ ] Client assignment UI (currently manual via SQL)
- [ ] PT can't see only their assigned clients (shows all)
- [ ] No "forgot password" flow
- [ ] No 2FA for admins

---

## 📝 Quick Reference

### Admin Credentials
- **Username:** `roxptadmin`
- **Password:** `1gfGLi20jerpVaWJMTQ0`

### Test PT Credentials (after creation)
- **Username:** `testcoach@roxpt.com`
- **Password:** `test123`

### SQL to Assign Client to PT
```sql
-- Get PT ID
SELECT id, name FROM personal_trainers;

-- Assign client
UPDATE clients 
SET assigned_pt_id = '<pt_uuid_here>' 
WHERE email = 'client@example.com';
```

---

**Last Updated:** 2025-11-12
**Status:** ✅ Ready for testing


