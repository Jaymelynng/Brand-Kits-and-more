

## Remove Contact & Location Section from Gym Profile

### What's changing
Remove the "Contact & Location" card that appears on the gym profile page. It currently shows an empty "Click Edit to add contact information" message and isn't needed.

### Technical Details

**Files to modify:**

1. **`src/pages/GymProfile.tsx`** -- Remove the import of `GymContactInfo` and delete the JSX block that renders the Contact & Location section (around lines 1987-1997).

2. **`src/components/GymContactInfo.tsx`** -- Delete this file entirely since it will no longer be used anywhere.

This is a straightforward removal with no side effects on other features.

