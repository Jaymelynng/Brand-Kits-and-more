

## Issue: Admin Access Button Missing at Bottom

The "Admin Access" button in the footer is wrapped in `{!isAdmin && (...)}`, so it intentionally hides when you're logged in as admin. The idea was that admins use the small rose-gold diamond in the top navigation bar instead.

This is confusing UX. Here's the plan:

### Changes

**`src/pages/Index.tsx`** — Update the footer admin section:
- When **not logged in**: Show "Admin Access" button that navigates to `/auth`
- When **logged in but not admin**: Show "Admin Access" button with access denied behavior
- When **logged in as admin**: Show an "Admin Toolkit" button that opens the admin toolkit panel directly

This way there's always a visible admin entry point at the bottom regardless of auth state, and admins get a clear button to open their toolkit from the footer too.

### Technical Detail

Replace the conditional `{!isAdmin && (...)}` block (around lines 237-253) with an always-visible button that changes label and behavior based on `user` and `isAdmin` state:
- `!user` → navigate to `/auth`
- `user && !isAdmin` → show access denied toast
- `user && isAdmin` → call `setIsAdminToolkitOpen(true)`

