

## Uniform Gym Cards with Enhanced Shadows and Color Management

### Problem
- Gym cards with 3 colors are shorter than those with 4 colors, creating an uneven grid
- Cards could use more dramatic box shadows to "pop" more
- There's no way to add or remove colors from the main dashboard (only editing existing colors works in edit mode)

### Changes

**1. Force all gym cards to the same height**
- In `GymCard.tsx`, the Brand Colors section currently has `min-h-[220px]` which isn't enough to equalize cards with different color counts
- Will increase `min-h` to accommodate the maximum expected colors (4-5 colors) so all cards are uniform
- The grid already uses `items-stretch` which helps, but the inner content needs to flex properly to fill the space

**2. Enhanced box shadows**
- Add stronger multi-layer box shadows to each card for a more dramatic 3D "pop" effect
- Increase the hover shadow even more for a clear lift effect
- Apply beveled inset highlights for depth

**3. Add/Edit/Remove colors (in edit mode)**
- Add a `useDeleteGymColor` hook in `useGyms.ts` to delete a color from the database
- Show a small "+" button in the Brand Colors section (edit mode only) to add a new color via a color picker
- Show a small "x" button on each color swatch (edit mode only) to remove that color
- These controls only appear when edit mode is active, keeping the default view clean

### Technical Details

**Files to modify:**

- `src/hooks/useGyms.ts` -- Add `useDeleteGymColor` mutation that deletes from `gym_colors` table by color ID
- `src/components/GymCard.tsx` -- Three changes:
  - Increase Brand Colors `min-h` to ~280px so 3-color and 4-color cards match
  - Enhance card `boxShadow` styles with deeper, multi-layer shadows (both default and hover states)
  - In edit mode: add "+" button to add a color (using `useAddGymColor`), and "x" delete button on each color swatch (using new `useDeleteGymColor`)
- `src/components/shared/ColorSwatch.tsx` -- Add optional `onDelete` prop to show a small delete icon when in edit mode

