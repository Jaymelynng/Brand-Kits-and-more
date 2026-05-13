## Goal
Let you rename uploaded items on a gym profile page directly from each card via a pencil icon. Display name only — the underlying storage file and public URL stay untouched, so nothing that already references the URL breaks.

## Scope
1. **Logos** (`gym_logos.filename`) — rename the label shown under each logo card.
2. **Brand Elements** (`gym_elements`) — rename the element label. Currently `gym_elements` has no dedicated name column; we'll add one.

## Changes

### Database
- Add `display_name TEXT` column to `gym_elements` (nullable, falls back to `element_type` when empty).
- No schema change for `gym_logos` — reuse existing `filename` column.

### Hooks (`src/hooks/useGyms.ts`)
- Add `useRenameLogo({ logoId, filename })` → updates `gym_logos.filename`.
- Add `useRenameElement({ elementId, displayName })` → updates `gym_elements.display_name`.
- Both invalidate the `['gyms']` query on success.

### UI — Gym profile (`src/pages/GymProfile.tsx` + logo/element card components)
- Add a small pencil icon button on each logo card and each brand element card (top-right corner, only visible to admins / in edit mode, matching existing edit affordances).
- Click pencil → the filename label swaps to an inline `<Input>` pre-filled with the current name.
- Enter or blur → save via the rename hook + toast confirmation.
- Esc → cancel without saving.
- High-contrast styling, squared edges, rose-gold accent on the pencil per project design rules.

### Behavior
- Only the visible label changes. Public Supabase URL, file path, and any references elsewhere are unaffected.
- Empty name on save reverts to original (no blank labels).

## Out of scope
- Renaming the actual storage object (would change URLs and break references).
- Renaming hero videos or color swatches.
- Bulk rename.

## Files touched
- `supabase/migrations/<new>.sql` — add `display_name` to `gym_elements`
- `src/hooks/useGyms.ts` — two new mutations
- `src/pages/GymProfile.tsx` (and any extracted logo/element card subcomponents) — pencil + inline editor
