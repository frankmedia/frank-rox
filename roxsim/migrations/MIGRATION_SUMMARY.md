# Migration Summary: Add Sex & Surname Fields

## Date: 2025-01-29

---

## SQL Changes

### File: `migrations/add_sex_field.sql`

```sql
-- Add surname column
ALTER TABLE public.roxsim_users 
ADD COLUMN IF NOT EXISTS surname TEXT;

-- Add sex column
ALTER TABLE public.roxsim_users 
ADD COLUMN IF NOT EXISTS sex TEXT CHECK (sex IN ('male', 'female', 'other'));

-- Create index for competitions
CREATE INDEX IF NOT EXISTS roxsim_users_sex_idx ON public.roxsim_users(sex);
```

### What Changed in Database:
1. ✅ Added `surname` column to `roxsim_users` table (TEXT, nullable)
2. ✅ Added `sex` column to `roxsim_users` table (TEXT, nullable, constrained to 'male'/'female'/'other')
3. ✅ Created index on `sex` column for fast filtering

---

## App Changes

### 1. TypeScript Types (`src/types/index.ts`)
```typescript
export interface UserProfile {
  name: string;
  surname?: string;           // ✅ Already existed
  email?: string;
  dateOfBirth?: string;
  sex?: 'male' | 'female' | 'other';  // ✅ ADDED
  athletePhoto?: string;
  history: SimulationResult[];
  // ...
}
```

### 2. Profile Page UI (`src/pages/Profile.tsx`)
Added new dropdown field:
```tsx
<select
  value={profile.sex || ''}
  onChange={(e) => updateProfile({ sex: e.target.value })}
>
  <option value="" disabled>Select...</option>
  <option value="male">Male</option>
  <option value="female">Female</option>
  <option value="other">Other</option>
</select>
```

**Location**: Below "Date of Birth" field, above the info message

---

## Impact on Existing App

### ✅ SAFE - No Breaking Changes

#### Will the app break?
**NO** - The changes are completely backward compatible:

1. **Existing users**: Will have `NULL` values for `sex` field
   - App will continue to work normally
   - Profile page will show empty dropdown (no selection)
   - They can optionally fill it in

2. **New users**: Can fill in the `sex` field when setting up profile

3. **Existing functionality**: 
   - All existing features continue to work
   - No code depends on `sex` field yet
   - It's only used for future competition features

#### What happens to existing data?
- **Existing users**: `sex` = `NULL` (empty)
- **No data loss**: All existing profile data remains intact
- **No migration needed**: Users update their profile when they want

#### When will `sex` be required?
- **Now**: Optional field, can be left empty
- **Future**: When entering competitions, users will be prompted to complete their profile (including `sex`)
- **Validation**: Competition entry will check if profile is complete

---

## Testing Checklist

### After Running Migration:

1. **Check Database**:
   ```sql
   -- Verify columns exist
   SELECT column_name, data_type, is_nullable 
   FROM information_schema.columns 
   WHERE table_name = 'roxsim_users' 
   AND column_name IN ('surname', 'sex');
   
   -- Check existing users (should have NULL for sex)
   SELECT id, name, surname, sex FROM roxsim_users LIMIT 5;
   ```

2. **Test App**:
   - [ ] Open Profile page - should load without errors
   - [ ] See new "Sex" dropdown below Date of Birth
   - [ ] Dropdown should show "Select..." placeholder
   - [ ] Select "Male" - should save correctly
   - [ ] Reload app - selection should persist
   - [ ] Change to "Female" - should update
   - [ ] Change to "Other" - should update

3. **Test Existing Users**:
   - [ ] Existing users can log in normally
   - [ ] Profile page loads with empty sex field
   - [ ] Can continue using app without filling sex
   - [ ] Can optionally fill in sex field

---

## Rollback Plan

If something goes wrong, you can rollback:

```sql
-- Remove the columns
ALTER TABLE public.roxsim_users DROP COLUMN IF EXISTS sex;
ALTER TABLE public.roxsim_users DROP COLUMN IF EXISTS surname;

-- Remove the index
DROP INDEX IF EXISTS roxsim_users_sex_idx;
```

Then revert the app code changes in:
- `src/types/index.ts`
- `src/pages/Profile.tsx`

---

## Next Steps

1. ✅ **Run the migration** in Supabase SQL Editor
2. ✅ **Test the app** on localhost
3. ✅ **Deploy app changes** (the TypeScript and UI updates)
4. ✅ **Monitor** for any issues
5. ⏳ **Future**: Build competition entry flow that requires complete profile

---

## Notes

- The `surname` field already existed in the TypeScript types but wasn't in the database - now it's added
- The `sex` field is new to both database and app
- Both fields are **optional** (nullable) to maintain backward compatibility
- Competition features (Phase 2) will validate that these fields are filled before allowing entry

---

## Files Modified

### Database:
- ✅ `migrations/add_sex_field.sql` (new migration file)

### App Code:
- ✅ `src/types/index.ts` (added `sex` to UserProfile interface)
- ✅ `src/pages/Profile.tsx` (added sex dropdown UI)

### No changes needed in:
- ❌ `src/contexts/UserContext.tsx` (uses UserProfile type, automatically gets new field)
- ❌ Any other files (no breaking changes)

