

## Remove Gym Info Section from All Profile Pages

### What's Changing
Remove the entire "Gym Info" card from gym profile pages -- the block containing Address, Phone, Email, Website, Facebook, Instagram, and Programs Offered fields. This data already lives in the Admin dashboard's "Manage Gyms" table where it belongs for bulk editing.

### File to Change

**`src/pages/GymProfile.tsx`** -- Delete lines 892-1194 (the entire `{/* Gym Info Card */}` section, from the `<div className="max-w-6xl mx-auto mb-8">` wrapper through the closing `</BrandCard>` and `</div>`).

This removes:
- Address field + inline editing
- Phone field + inline editing
- Email field + inline editing
- Website field + inline editing
- Facebook field + inline editing
- Instagram field + inline editing
- Programs Offered field + inline editing

### What Stays
- All the `editingField` / `setEditingField` / `editingFieldValue` state variables and `updateGymInfoMutation` can stay for now (unused code, no runtime impact) or be cleaned up in a follow-up
- The Admin dashboard's Manage Gyms table still has all this data for bulk management
- Logo showcase, colors, elements sections below are untouched

### No Database Changes
The `gyms` table columns (address, phone, email, etc.) remain -- just removing the profile page UI for them.

