# Admin → PT → Client System

## Overview
Three-tier user system for RoxPT:
- **Admins**: Super users who manage PTs and have full access to all features
- **Personal Trainers (PTs)**: Manage clients and create programs
- **Clients**: Athletes who follow training programs

## Database Schema

### Tables Created
1. **`admins`** - Super users
   - `id` (UUID, primary key)
   - `email` (unique, used for login)
   - `password` (plain text for now, hash in production)
   - `name`
   - `created_at`, `updated_at`
   - `is_active` (boolean)

2. **`personal_trainers`** - PTs who manage clients
   - `id` (UUID, primary key)
   - `email` (unique, used for login)
   - `password`
   - `name`
   - `bio`, `phone`, `profile_image_url`
   - `certifications` (text array)
   - `specializations` (text array, e.g., ["Hyrox", "Strength"])
   - `created_by_admin_id` (FK to admins)
   - `created_at`, `updated_at`
   - `is_active` (boolean)

3. **`clients`** (updated)
   - Added: `assigned_pt_id` (FK to personal_trainers)
   - **Relationship**: Each client has ONE PT, each PT can have MANY clients

### Views
- **`pt_client_counts`**: Analytics view showing PT name, email, and client count

## Authentication Flow

### Login Priority (AuthContext)
1. Try **admin** login first (email match)
2. Try **PT** login (email match)
3. Try **client** login (name match, for backward compatibility)

### User Object
```typescript
interface User {
  username: string;
  email: string;
  name: string;
  clientId?: string;  // For clients
  ptId?: string;      // For PTs
  adminId?: string;   // For admins
  role: 'client' | 'pt' | 'admin';
}
```

## Access Control

### Routes
- **`/admin/*`**: Accessible by PTs and Admins
- **`/admin/exercises`**: **Admin only**
- **`/admin/personal-trainers`**: **Admin only**
- Other `/admin` routes: PT and Admin

### Implementation
- Uses `useAuth()` hook to check `user.role`
- Redirects to `/login` if not authenticated
- Redirects to `/admin` if insufficient permissions

## Admin Features

### PT Management (`/admin/personal-trainers`)
Admins can:
- ✅ View all PTs with client counts
- ✅ Add new PT accounts
- ✅ Activate/deactivate PTs
- ✅ Delete PTs (clients become unassigned)
- ✅ View PT specializations and bio

### Exercise Management (`/admin/exercises`)
Admins can:
- ✅ View/edit all exercises
- ✅ Add new exercises
- ✅ Update exercise metadata (tags, patterns, equipment)
- ✅ Add YouTube links

## Migration Steps

### 1. Run SQL Migration
```bash
# In Supabase SQL Editor, run:
/migrations/create_admins_and_pts.sql
```

This will:
- Create `admins` and `personal_trainers` tables
- Update `clients` table with `assigned_pt_id`
- Set up RLS policies
- Seed admin account:
  - Admin: `roxptadmin` / `1gfGLi20jerpVaWJMTQ0`

### 2. Test Login
1. Navigate to `/login`
2. Login as admin: `roxptadmin` / `1gfGLi20jerpVaWJMTQ0`
3. Navigate to `/admin/personal-trainers`
4. Add a new PT
5. Logout and login as the new PT
6. Verify PT can access `/admin` but NOT `/admin/exercises`

### 3. Assign Clients to PTs
```sql
-- Example: Assign client to PT
UPDATE public.clients
SET assigned_pt_id = '<pt_uuid>'
WHERE email = 'client@example.com';
```

Or build a UI for this in the Clients admin page.

## Future Enhancements

### Phase 2: PT Dashboard
- [ ] PT-specific dashboard showing their clients
- [ ] Client progress tracking
- [ ] Program creation wizard for PTs
- [ ] Messaging system between PT and clients

### Phase 3: Client Assignment UI
- [ ] Add "Assign PT" dropdown in `/admin/clients`
- [ ] Bulk assign clients to PTs
- [ ] PT can request new clients

### Phase 4: Permissions & Roles
- [ ] Fine-grained permissions (e.g., "can_edit_exercises", "can_delete_clients")
- [ ] PT tiers (head coach, assistant coach)
- [ ] Client self-registration with PT selection

### Phase 5: Security
- [ ] Hash passwords (bcrypt/argon2)
- [ ] JWT tokens for API auth
- [ ] Session management
- [ ] Password reset flow
- [ ] 2FA for admins

## Files Modified/Created

### Created
- `/migrations/create_admins_and_pts.sql`
- `/src/pages/admin/PersonalTrainers.tsx`
- `/ADMIN_PT_CLIENT_SYSTEM.md` (this file)

### Modified
- `/src/contexts/AuthContext.tsx` - Added admin/PT login logic
- `/src/App.tsx` - Added `/admin/personal-trainers` route
- `/src/pages/admin/Exercises.tsx` - Added admin-only access check

## Testing Checklist

- [ ] Admin can login and access all `/admin` routes
- [ ] PT can login and access `/admin` but NOT `/admin/exercises`
- [ ] Client can login and access their training pages
- [ ] Admin can create new PT accounts
- [ ] Admin can activate/deactivate PTs
- [ ] Admin can delete PTs
- [ ] PT client count displays correctly
- [ ] Invalid credentials are rejected
- [ ] Logout clears session properly

## Notes

- **Security Warning**: Passwords are stored in plain text. Implement hashing before production.
- **Custom Auth**: This system uses localStorage-based auth, NOT Supabase Auth. The app connects as `anon` role.
- **RLS Policies**: All tables use permissive RLS policies for `anon` role. Tighten these in production.
- **Client Assignment**: Currently manual via SQL. Build UI for this in Phase 3.

---

**Last Updated**: 2025-11-12
**Status**: ✅ Core system implemented and ready for testing

