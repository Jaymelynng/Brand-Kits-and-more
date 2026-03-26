

## Problem

The admin diamond button only renders when `isAdmin` is `true` (line 70 of `GymNavigation.tsx`). The `useAuth` hook checks admin status asynchronously from the `user_roles` table, but it may fail silently or have a timing issue where:

1. The auth state listener fires, but the `checkAdminStatus` query fails or returns no data
2. The `isAdmin` flag never becomes `true`, so the diamond never appears

Additionally, the diamond is **only visible to admins** — there's no way for a logged-in non-admin user to even attempt access (they'd get a toast). But from the `Index.tsx` code, `handleAdminClick` already handles all three cases (not logged in, not admin, admin). The diamond is just hidden entirely for non-admins.

## Plan

### 1. Always show the admin diamond for logged-in users
Change line 70 in `GymNavigation.tsx` from `{isAdmin && ...}` to `{user && ...}` so any authenticated user can click it. The access control in `handleAdminClick` (Index.tsx) already handles denying non-admins with a toast.

### 2. Add visual distinction for admins
Keep the enhanced styling on the diamond when the user is an admin (pass `isAdmin` as a prop to `SecretAdminButton` for the glow/size effect), but show a simpler version for regular authenticated users.

### 3. Ensure admin check doesn't fail silently
Add a `console.log` or improve error handling in `checkAdminStatus` in `useAuth.ts` to surface any issues with the role query. Also ensure the loading state is properly handled so the navigation doesn't render before the admin check completes.

### Technical Details

**File: `src/components/GymNavigation.tsx`** (line 70)
- Change condition from `isAdmin &&` to `user &&`

**File: `src/components/SecretAdminButton.tsx`**
- Add optional `isAdmin` prop to control enhanced vs. subtle styling

**File: `src/hooks/useAuth.ts`**
- No structural changes needed, but add logging to `checkAdminStatus` catch block to help debug if the query is failing

