

## Add Gym Info Section to Profile Page

### What Changes

Add a clean "Gym Info" card near the top of each gym's profile page showing basic contact/business details pulled from the existing `gyms` table fields: name, address, phone, website, email. Admins can edit these inline.

### Technical Details

**File: `src/pages/GymProfile.tsx`**
- Add a compact info card below the hero/dashboard area showing:
  - Address (with a Google Maps link)
  - Phone (clickable `tel:` link)
  - Email (clickable `mailto:` link)  
  - Website (clickable external link)
  - Customer Portal link (new field, or use website for now)
- Each field shows a dash or "Not set" if empty
- Admin users see a small edit (pencil) icon that opens inline editing for each field
- Use icons from lucide-react: `MapPin`, `Phone`, `Mail`, `Globe`, `ExternalLink`

**File: `src/hooks/useGyms.ts`**
- Add a new `useUpdateGymInfo` mutation to update address, phone, email, website fields on the `gyms` table

**No database changes needed** - the `gyms` table already has `address`, `phone`, `email`, `website` columns.

### Layout
- Horizontal row of info chips/pills or a simple 2-column grid inside a card
- Compact design so it doesn't dominate the page - sits above or alongside the brand colors section
- Consistent with existing BrandCard styling

